// ============================================================
// ChaiKhata — Firestore Service Layer
// ============================================================
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  runTransaction,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  ShopDoc,
  MenuItemDoc,
  WorkerDoc,
  CustomerDoc,
  OrderDoc,
  OrderItem,
  OrderEventDoc,
  CashSettlementDoc,
  OrderStatus,
  CashStatus,
  OrderEventType,
  UserDoc,
  WorkerCashSummary,
} from './types';
import { generateDeliveryCode } from './utils';

// ─── Shops ───────────────────────────────────────────────────────────────────

export async function getShops(): Promise<ShopDoc[]> {
  const snap = await getDocs(collection(db, 'shops'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopDoc));
}

export async function getShop(shopId: string): Promise<ShopDoc | null> {
  const snap = await getDoc(doc(db, 'shops', shopId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ShopDoc;
}

export async function createShop(data: Omit<ShopDoc, 'id'>): Promise<string> {
  const ref = doc(collection(db, 'shops'));
  await setDoc(ref, { ...data, id: ref.id });
  return ref.id;
}

export function onShopsSnapshot(callback: (shops: ShopDoc[]) => void): () => void {
  return onSnapshot(collection(db, 'shops'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopDoc)));
  });
}

// ─── Menu Items ──────────────────────────────────────────────────────────────

export async function getMenuItems(shopId: string): Promise<MenuItemDoc[]> {
  const snap = await getDocs(
    query(collection(db, 'shops', shopId, 'menuItems'), where('available', '==', true))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItemDoc));
}

export function onMenuItemsSnapshot(
  shopId: string,
  callback: (items: MenuItemDoc[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'shops', shopId, 'menuItems'), orderBy('teaType')),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItemDoc)));
    }
  );
}

export async function upsertMenuItem(
  shopId: string,
  item: Omit<MenuItemDoc, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const now = Date.now();
  if (item.id) {
    await updateDoc(doc(db, 'shops', shopId, 'menuItems', item.id), {
      ...item,
      updatedAt: now,
    });
    return item.id;
  }
  const ref = doc(collection(db, 'shops', shopId, 'menuItems'));
  await setDoc(ref, { ...item, id: ref.id, createdAt: now, updatedAt: now });
  return ref.id;
}

// ─── Workers ─────────────────────────────────────────────────────────────────

export async function getWorkers(shopId: string): Promise<WorkerDoc[]> {
  const snap = await getDocs(
    query(collection(db, 'workers'), where('shopId', '==', shopId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkerDoc));
}

export async function createWorker(data: Omit<WorkerDoc, 'id'>): Promise<string> {
  const ref = doc(collection(db, 'workers'));
  await setDoc(ref, { ...data, id: ref.id });
  return ref.id;
}

export function onWorkersSnapshot(
  shopId: string,
  callback: (workers: WorkerDoc[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'workers'), where('shopId', '==', shopId)),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkerDoc)));
    }
  );
}

export async function getWorkerByUid(uid: string): Promise<WorkerDoc | null> {
  const snap = await getDocs(
    query(collection(db, 'workers'), where('uid', '==', uid))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as WorkerDoc;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function createOrder(params: {
  customerId: string;
  customerName: string;
  customerPhone: string;
  shopId: string;
  items: OrderItem[];
  totalAmount: number;
}): Promise<{ orderId: string; deliveryCode: string }> {
  const deliveryCode = generateDeliveryCode();
  const now = Date.now();
  const ref = doc(collection(db, 'orders'));

  const order: OrderDoc = {
    id: ref.id,
    customerId: params.customerId,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    shopId: params.shopId,
    items: params.items,
    totalAmount: params.totalAmount,
    deliveryCode,
    status: 'PLACED',
    cashStatus: 'AWAITING_CUSTOMER_CONFIRMATION',
    createdAt: now,
  };

  await setDoc(ref, order);

  // Log event
  await addOrderEvent({
    orderId: ref.id,
    type: 'ORDER_CREATED',
    actorUid: params.customerId,
    actorRole: 'CUSTOMER',
    actorName: params.customerName,
    timestamp: now,
  });

  return { orderId: ref.id, deliveryCode };
}

export async function assignWorkerToOrder(
  orderId: string,
  workerId: string,
  workerName: string,
  ownerUid: string
): Promise<void> {
  const now = Date.now();
  await updateDoc(doc(db, 'orders', orderId), {
    workerId,
    workerName,
    status: 'ASSIGNED' as OrderStatus,
    assignedAt: now,
  });
  await addOrderEvent({
    orderId,
    type: 'WORKER_ASSIGNED',
    actorUid: ownerUid,
    actorRole: 'OWNER',
    actorName: workerName,
    timestamp: now,
    metadata: { workerId, workerName },
  });
}

export async function startDelivery(orderId: string, workerId: string): Promise<void> {
  const now = Date.now();
  await updateDoc(doc(db, 'orders', orderId), {
    status: 'OUT_FOR_DELIVERY' as OrderStatus,
    outForDeliveryAt: now,
  });
  await addOrderEvent({
    orderId,
    type: 'OUT_FOR_DELIVERY',
    actorUid: workerId,
    actorRole: 'WORKER',
    timestamp: now,
  });
}

/**
 * Worker verifies delivery code. Returns true if correct, false if wrong.
 * Worker CANNOT set cashStatus = CUSTOMER_CONFIRMED.
 */
export async function verifyDeliveryCode(
  orderId: string,
  enteredCode: string,
  workerId: string
): Promise<boolean> {
  const orderSnap = await getDoc(doc(db, 'orders', orderId));
  if (!orderSnap.exists()) return false;

  const order = orderSnap.data() as OrderDoc;
  if (order.deliveryCode !== enteredCode) return false;

  const now = Date.now();
  await updateDoc(doc(db, 'orders', orderId), {
    status: 'DELIVERED' as OrderStatus,
    deliveredAt: now,
    // cashStatus remains AWAITING_CUSTOMER_CONFIRMATION - customer must confirm
  });

  await addOrderEvent({
    orderId,
    type: 'DELIVERY_CODE_VERIFIED',
    actorUid: workerId,
    actorRole: 'WORKER',
    timestamp: now,
  });

  return true;
}

/**
 * Customer confirms they gave cash to the worker.
 * ONLY the authenticated customer can call this.
 * This is enforced by Firestore Security Rules too.
 */
export async function customerConfirmCash(
  orderId: string,
  customerUid: string
): Promise<void> {
  const orderSnap = await getDoc(doc(db, 'orders', orderId));
  if (!orderSnap.exists()) throw new Error('Order not found');

  const order = orderSnap.data() as OrderDoc;

  // Client-side guard: only the order's customer can confirm
  if (order.customerId !== customerUid) {
    throw new Error('Unauthorized: only the customer can confirm cash payment');
  }

  if (order.status !== 'DELIVERED') {
    throw new Error('Order not yet delivered');
  }

  const now = Date.now();
  await updateDoc(doc(db, 'orders', orderId), {
    cashStatus: 'CUSTOMER_CONFIRMED' as CashStatus,
    customerConfirmedAt: now,
    customerConfirmedBy: customerUid,
  });

  await addOrderEvent({
    orderId,
    type: 'CUSTOMER_CASH_CONFIRMED',
    actorUid: customerUid,
    actorRole: 'CUSTOMER',
    timestamp: now,
    metadata: { amount: order.totalAmount },
  });
}

/**
 * Owner records cash settlement from a worker.
 */
export async function recordCashSettlement(params: {
  shopId: string;
  workerId: string;
  workerName: string;
  amount: number;
  ownerUid: string;
}): Promise<string> {
  const ref = doc(collection(db, 'cashSettlements'));
  const settlement: CashSettlementDoc = {
    id: ref.id,
    shopId: params.shopId,
    workerId: params.workerId,
    workerName: params.workerName,
    amount: params.amount,
    confirmedByOwner: true,
    confirmedByOwnerUid: params.ownerUid,
    createdAt: Date.now(),
  };
  await setDoc(ref, settlement);
  return ref.id;
}

// ─── Order Event Log ──────────────────────────────────────────────────────────

export async function addOrderEvent(event: Omit<OrderEventDoc, 'id'>): Promise<void> {
  const ref = doc(collection(db, 'orderEvents'));
  await setDoc(ref, { ...event, id: ref.id });
}

// ─── Real-time Order Listeners ────────────────────────────────────────────────

/** Listen to a single order */
export function onOrderSnapshot(
  orderId: string,
  callback: (order: OrderDoc | null) => void
): () => void {
  return onSnapshot(doc(db, 'orders', orderId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ id: snap.id, ...snap.data() } as OrderDoc);
  });
}

/** Listen to all orders for a customer */
export function onCustomerOrdersSnapshot(
  customerId: string,
  callback: (orders: OrderDoc[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'orders'),
      where('customerId', '==', customerId)
    ),
    (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderDoc));
      orders.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      callback(orders);
    }
  );
}

/** Listen to assigned orders for a worker */
export function onWorkerOrdersSnapshot(
  workerId: string,
  callback: (orders: OrderDoc[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'orders'),
      where('workerId', '==', workerId)
    ),
    (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderDoc));
      orders.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      callback(orders);
    }
  );
}

/** Listen to all orders for a shop (owner) */
export function onShopOrdersSnapshot(
  shopId: string,
  callback: (orders: OrderDoc[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'orders'),
      where('shopId', '==', shopId)
    ),
    (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderDoc));
      orders.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      callback(orders);
    }
  );
}

/** Listen to order events (timeline) */
export function onOrderEventsSnapshot(
  orderId: string,
  callback: (events: OrderEventDoc[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'orderEvents'),
      where('orderId', '==', orderId)
    ),
    (snap) => {
      const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderEventDoc));
      events.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
      callback(events);
    }
  );
}

/** Listen to cash settlements for a shop */
export function onCashSettlementsSnapshot(
  shopId: string,
  callback: (settlements: CashSettlementDoc[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'cashSettlements'),
      where('shopId', '==', shopId)
    ),
    (snap) => {
      const settlements = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CashSettlementDoc));
      settlements.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      callback(settlements);
    }
  );
}

// ─── Computed / Aggregation ───────────────────────────────────────────────────

/**
 * Compute worker cash summaries from orders + settlements.
 * Used on Owner dashboard.
 */
export function computeWorkerCashSummaries(
  orders: OrderDoc[],
  settlements: CashSettlementDoc[]
): WorkerCashSummary[] {
  const deliveredOrders = orders.filter(
    (o) => o.status === 'DELIVERED' && o.workerId
  );

  const workerMap = new Map<string, WorkerCashSummary>();

  for (const order of deliveredOrders) {
    if (!order.workerId) continue;
    if (!workerMap.has(order.workerId)) {
      workerMap.set(order.workerId, {
        workerId: order.workerId,
        workerName: order.workerName ?? order.workerId,
        deliveredOrders: 0,
        expectedCash: 0,
        customerConfirmedCash: 0,
        settledCash: 0,
        outstandingCash: 0,
      });
    }
    const summary = workerMap.get(order.workerId)!;
    summary.deliveredOrders += 1;
    summary.expectedCash += order.totalAmount;
    if (
      order.cashStatus === 'CUSTOMER_CONFIRMED' ||
      order.cashStatus === 'OWNER_SETTLED'
    ) {
      summary.customerConfirmedCash += order.totalAmount;
    }
  }

  // Add settlements
  for (const settlement of settlements) {
    const summary = workerMap.get(settlement.workerId);
    if (summary) {
      summary.settledCash += settlement.amount;
    }
  }

  // Compute outstanding
  for (const summary of workerMap.values()) {
    summary.outstandingCash = summary.customerConfirmedCash - summary.settledCash;
  }

  return Array.from(workerMap.values());
}

// ─── Accept Order (Owner) ─────────────────────────────────────────────────────

export async function acceptOrder(orderId: string, ownerUid: string): Promise<void> {
  const now = Date.now();
  await updateDoc(doc(db, 'orders', orderId), {
    status: 'ACCEPTED' as OrderStatus,
    acceptedAt: now,
  });
  await addOrderEvent({
    orderId,
    type: 'ORDER_ACCEPTED',
    actorUid: ownerUid,
    actorRole: 'OWNER',
    timestamp: now,
  });
}

// ─── Get today's orders for a shop ───────────────────────────────────────────

export function getTodayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
