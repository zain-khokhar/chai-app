// ============================================================
// ChaiKhata — Shared TypeScript Types
// ============================================================

export type UserRole = 'OWNER' | 'WORKER' | 'CUSTOMER';

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type CashStatus =
  | 'NOT_DUE'
  | 'AWAITING_CUSTOMER_CONFIRMATION'
  | 'CUSTOMER_CONFIRMED'
  | 'OWNER_SETTLED'
  | 'DISPUTED';

export type OrderEventType =
  | 'ORDER_CREATED'
  | 'ORDER_ACCEPTED'
  | 'WORKER_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERY_CODE_VERIFIED'
  | 'CUSTOMER_CASH_CONFIRMED'
  | 'OWNER_CASH_SETTLED'
  | 'ORDER_CANCELLED';

// ============================================================
// Firestore Document Types
// ============================================================

export interface UserDoc {
  uid: string;
  role: UserRole;
  name: string;
  phone: string;
  shopId?: string; // for OWNER
  createdAt: number;
}

export interface ShopDoc {
  id: string;
  ownerUid: string;
  ownerName: string;
  shopName: string;
  phone: string;
  address: string;
  area: string;
  lat?: number;
  lng?: number;
  open: boolean;
  minPrice: number;
  createdAt: number;
}

export interface MenuItemDoc {
  id: string;
  teaType: string;
  size: 'Chota Cup' | 'Bara Cup';
  price: number; // integer PKR only
  available: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkerDoc {
  id: string;
  uid: string;
  shopId: string;
  name: string;
  phone: string;
  zone: string;
  active: boolean;
  createdAt: number;
}

export interface CustomerDoc {
  id: string;
  uid: string;
  name: string;
  phone: string;
  defaultArea?: string;
  lat?: number;
  lng?: number;
  createdAt: number;
}

export interface OrderItem {
  itemId: string;
  teaType: string;
  size: string;
  price: number; // snapshot at time of order
  qty: number;
  lineTotal: number;
}

export interface OrderDoc {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  shopId: string;
  workerId?: string;
  workerName?: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryCode: string; // 4-digit, never shown to worker
  status: OrderStatus;
  cashStatus: CashStatus;
  createdAt: number;
  acceptedAt?: number;
  assignedAt?: number;
  outForDeliveryAt?: number;
  deliveredAt?: number;
  customerConfirmedAt?: number;
  customerConfirmedBy?: string; // uid
  cancelledAt?: number;
}

export interface CashSettlementDoc {
  id: string;
  shopId: string;
  workerId: string;
  workerName: string;
  amount: number;
  confirmedByOwner: boolean;
  confirmedByOwnerUid?: string;
  orderIds?: string[]; // optional reference
  createdAt: number;
}

export interface OrderEventDoc {
  id: string;
  orderId: string;
  type: OrderEventType;
  actorUid: string;
  actorRole: UserRole;
  actorName?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ============================================================
// UI/App State Types
// ============================================================

export interface CartItem {
  itemId: string;
  teaType: string;
  size: string;
  price: number;
  qty: number;
}

export interface WorkerCashSummary {
  workerId: string;
  workerName: string;
  deliveredOrders: number;
  expectedCash: number;
  customerConfirmedCash: number;
  settledCash: number;
  outstandingCash: number;
}
