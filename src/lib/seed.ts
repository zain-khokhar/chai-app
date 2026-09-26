// ============================================================
// ChaiKhata — Demo Seed Data
// Populates Firestore with test data for prototype testing
// ============================================================
import { doc, setDoc, collection, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from './firebase';
import { DEMO_ACCOUNTS } from './auth';

const DEMO_SHOP_ID = 'demo-multan-chai-point';

export const SEED_MENU = [
  { teaType: 'Doodh Patti', size: 'Chota Cup', price: 40 },
  { teaType: 'Doodh Patti', size: 'Bara Cup', price: 70 },
  { teaType: 'Karak Chai', size: 'Chota Cup', price: 50 },
  { teaType: 'Karak Chai', size: 'Bara Cup', price: 90 },
  { teaType: 'Kashmiri Chai', size: 'Chota Cup', price: 80 },
  { teaType: 'Kashmiri Chai', size: 'Bara Cup', price: 140 },
  { teaType: 'Sabz Chai / Kehwa', size: 'Chota Cup', price: 40 },
  { teaType: 'Sabz Chai / Kehwa', size: 'Bara Cup', price: 70 },
  { teaType: 'Adrak Chai', size: 'Chota Cup', price: 45 },
  { teaType: 'Adrak Chai', size: 'Bara Cup', price: 80 },
  { teaType: 'Elaichi Chai', size: 'Chota Cup', price: 45 },
  { teaType: 'Elaichi Chai', size: 'Bara Cup', price: 80 },
  { teaType: 'Lipton / Black Tea', size: 'Chota Cup', price: 35 },
  { teaType: 'Lipton / Black Tea', size: 'Bara Cup', price: 60 },
];

function makeEmail(phone: string): string {
  return `${phone}@chaikhata.app`;
}

function makePassword(phone: string, pin: string): string {
  return `${phone}__${pin}__ck`;
}

export async function seedDemoData(): Promise<{
  customerUid: string;
  workerUid: string;
  ownerUid: string;
  shopId: string;
}> {
  const now = Date.now();

  // ── Create or get demo users ──────────────────────────────

  const createOrGetUser = async (phone: string, pin: string, name: string, role: string) => {
    const email = makeEmail(phone);
    const password = makePassword(phone, pin);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return cred.user.uid;
    } catch (err: any) {
      // User already exists — sign in to get uid
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user.uid;
    }
  };

  const ownerUid = await createOrGetUser(
    DEMO_ACCOUNTS.owner.phone,
    DEMO_ACCOUNTS.owner.pin,
    DEMO_ACCOUNTS.owner.name,
    'OWNER'
  );
  const customerUid = await createOrGetUser(
    DEMO_ACCOUNTS.customer.phone,
    DEMO_ACCOUNTS.customer.pin,
    DEMO_ACCOUNTS.customer.name,
    'CUSTOMER'
  );
  const workerUid = await createOrGetUser(
    DEMO_ACCOUNTS.worker.phone,
    DEMO_ACCOUNTS.worker.pin,
    DEMO_ACCOUNTS.worker.name,
    'WORKER'
  );

  // ── Write user documents ──────────────────────────────────

  await setDoc(doc(db, 'users', ownerUid), {
    uid: ownerUid,
    role: 'OWNER',
    name: DEMO_ACCOUNTS.owner.name,
    phone: DEMO_ACCOUNTS.owner.phone,
    shopId: DEMO_SHOP_ID,
    createdAt: now,
  }, { merge: true });

  await setDoc(doc(db, 'users', customerUid), {
    uid: customerUid,
    role: 'CUSTOMER',
    name: DEMO_ACCOUNTS.customer.name,
    phone: DEMO_ACCOUNTS.customer.phone,
    createdAt: now,
  }, { merge: true });

  await setDoc(doc(db, 'users', workerUid), {
    uid: workerUid,
    role: 'WORKER',
    name: DEMO_ACCOUNTS.worker.name,
    phone: DEMO_ACCOUNTS.worker.phone,
    createdAt: now,
  }, { merge: true });

  // ── Create customer profile ───────────────────────────────

  await setDoc(doc(db, 'customers', customerUid), {
    id: customerUid,
    uid: customerUid,
    name: DEMO_ACCOUNTS.customer.name,
    phone: DEMO_ACCOUNTS.customer.phone,
    defaultArea: 'Gulgasht',
    createdAt: now,
  }, { merge: true });

  // ── Create demo shop ──────────────────────────────────────

  await setDoc(doc(db, 'shops', DEMO_SHOP_ID), {
    id: DEMO_SHOP_ID,
    ownerUid,
    ownerName: DEMO_ACCOUNTS.owner.name,
    shopName: 'Multan Chai Point',
    phone: DEMO_ACCOUNTS.owner.phone,
    address: 'Gulgasht Colony, Near Main Chowk',
    area: 'Gulgasht',
    lat: 30.1575,
    lng: 71.5249,
    open: true,
    minPrice: 35,
    createdAt: now,
  }, { merge: true });

  // ── Seed menu items ───────────────────────────────────────

  const slug = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  for (const item of SEED_MENU) {
    const id = `${DEMO_SHOP_ID}-${slug(item.teaType)}-${slug(item.size)}`;
    await setDoc(doc(db, 'shops', DEMO_SHOP_ID, 'menuItems', id), {
      id,
      teaType: item.teaType,
      size: item.size,
      price: item.price,
      available: true,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  // ── Create worker record ──────────────────────────────────

  await setDoc(doc(db, 'workers', workerUid), {
    id: workerUid,
    uid: workerUid,
    shopId: DEMO_SHOP_ID,
    name: DEMO_ACCOUNTS.worker.name,
    phone: DEMO_ACCOUNTS.worker.phone,
    zone: 'Gulgasht',
    active: true,
    createdAt: now,
  }, { merge: true });

  return { customerUid, workerUid, ownerUid, shopId: DEMO_SHOP_ID };
}

export async function isDemoDataSeeded(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'shops', DEMO_SHOP_ID));
    return snap.exists();
  } catch {
    return false;
  }
}

export { DEMO_SHOP_ID };

