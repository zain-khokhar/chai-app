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
import { auth, db } from './firebase';
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
}): Promise<User> {
  const { name, phone, pin, role, shopId } = params;
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

  const userDoc: UserDoc = {
    uid: user.uid,
    role,
    name,
    phone,
    shopId,
    createdAt: Date.now(),
  };

  await setDoc(doc(db, 'users', user.uid), userDoc, { merge: true });

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
