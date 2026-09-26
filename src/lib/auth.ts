// ============================================================
// ChaiKhata — Auth Service
// ============================================================
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { auth, db, firebaseConfig } from './firebase';
import { UserDoc, UserRole } from './types';

/**
 * Map a phone number + PIN to an email-style credential for Firebase Auth.
 * We use email/password auth since no SMS cost is involved on Spark plan.
 * The "email" is synthetic: phone@chaikhata.app
 * The "password" is derived from phone + pin (for prototype only).
 */
function makeEmail(phone: string): string {
  return `${phone}@chaikhata.app`;
}

function makePassword(phone: string, pin: string): string {
  return `${phone}__${pin}__ck`;
}

// ─── Customer / Owner Signup ─────────────────────────────────────────────────

export async function signUpUser(params: {
  name: string;
  phone: string;
  pin: string;
  role: 'CUSTOMER' | 'OWNER';
  shopId?: string;
  shopName?: string;
}): Promise<User> {
  const { name, phone, pin, role, shopId, shopName } = params;
  const email = makeEmail(phone);
  const password = makePassword(phone, pin);

  let user: User;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    user = cred.user;
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use')) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
      } catch (loginErr) {
        throw new Error('This phone number is already registered. Please Login with your PIN.');
      }
    } else {
      throw err;
    }
  }

  let finalShopId = shopId;
  if (role === 'OWNER') {
    if (!finalShopId) {
      const { collection } = await import('firebase/firestore');
      const shopRef = doc(collection(db, 'shops'));
      finalShopId = shopRef.id;
      await setDoc(shopRef, {
        id: shopRef.id,
        ownerUid: user.uid,
        ownerName: name,
        shopName: shopName || `${name}'s Chai Point`,
        phone,
        address: 'Multan, Pakistan',
        area: 'Multan',
        open: true,
        minPrice: 40,
        createdAt: Date.now(),
      });
    }
  }

  const userDocData: Record<string, any> = {
    uid: user.uid,
    role,
    name,
    phone,
    createdAt: Date.now(),
  };

  if (finalShopId) {
    userDocData.shopId = finalShopId;
  }

  await setDoc(doc(db, 'users', user.uid), userDocData, { merge: true });

  // If customer, also create customer profile
  if (role === 'CUSTOMER') {
    await setDoc(doc(db, 'customers', user.uid), {
      id: user.uid,
      uid: user.uid,
      name,
      phone,
      createdAt: Date.now(),
    }, { merge: true });
  }

  return user;
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function loginUser(phone: string, pin: string): Promise<User> {
  const email = makeEmail(phone);
  const password = makePassword(phone, pin);
  const cred = await signInWithEmailAndPassword(auth, email, password);

  // Self-heal: ensure user document exists in Firestore
  const userRef = doc(db, 'users', cred.user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: cred.user.uid,
      role: 'CUSTOMER',
      name: 'Customer',
      phone,
      createdAt: Date.now(),
    });
  }

  return cred.user;
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// ─── Get User Profile ─────────────────────────────────────────────────────────

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

// ─── Auth state observer ──────────────────────────────────────────────────────

export function observeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// ─── Demo accounts ───────────────────────────────────────────────────────────
// These are seeded during demo mode

export const DEMO_ACCOUNTS = {
  customer: { phone: '03001234567', pin: '123456', name: 'Ali General Store' },
  worker: { phone: '03111234567', pin: '123456', name: 'Hamza' },
  owner: { phone: '03211234567', pin: '123456', name: 'Chai Point Owner' },
} as const;

// ─── Add Worker For Shop ─────────────────────────────────────────────────────

export async function createWorkerAccount(params: {
  shopId: string;
  name: string;
  phone: string;
  pin: string;
  zone: string;
}): Promise<string> {
  const { shopId, name, phone, pin, zone } = params;
  const email = makeEmail(phone);
  const password = makePassword(phone, pin);

  // Initialize secondary Firebase App so owner's active session is NOT replaced
  const secondaryAppName = 'workerCreationApp';
  let secondaryApp;
  if (getApps().some((app) => app.name === secondaryAppName)) {
    secondaryApp = getApp(secondaryAppName);
  } else {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  }
  const secondaryAuth = getAuth(secondaryApp);

  let workerUid: string;
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    workerUid = cred.user.uid;
    await secondaryAuth.signOut();
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use')) {
      const cred = await signInWithEmailAndPassword(secondaryAuth, email, password);
      workerUid = cred.user.uid;
      await secondaryAuth.signOut();
    } else {
      throw err;
    }
  }

  const now = Date.now();
  // 1. Write users/{uid}
  await setDoc(doc(db, 'users', workerUid), {
    uid: workerUid,
    role: 'WORKER',
    name,
    phone,
    shopId,
    createdAt: now,
  }, { merge: true });

  // 2. Write workers/{uid}
  await setDoc(doc(db, 'workers', workerUid), {
    id: workerUid,
    uid: workerUid,
    shopId,
    name,
    phone,
    zone: zone || 'Multan',
    active: true,
    createdAt: now,
  }, { merge: true });

  return workerUid;
}
