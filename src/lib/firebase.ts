// ============================================================
// ChaiKhata — Firebase initialization
// ============================================================
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Use placeholder values for build-time static generation
// Real values come from env vars at runtime
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyPlaceholder000000000000000000000000',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'chaikhata-placeholder.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'chaikhata-placeholder',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'chaikhata-placeholder.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:000000000000:web:placeholder0000000000',
};

// Initialize Firebase (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence (browser only, called lazily)
export async function enablePersistence(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const { enableIndexedDbPersistence } = await import('firebase/firestore');
    await enableIndexedDbPersistence(db);
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence unavailable: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported in this browser');
    }
  }
}

export default app;
