'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { observeAuthState, getUserDoc } from '@/lib/auth';
import { UserDoc } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userDoc: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let doc = await getUserDoc(firebaseUser.uid);
        if (!doc) {
          // Retry once in case of write latency right after registration
          await new Promise((r) => setTimeout(r, 400));
          doc = await getUserDoc(firebaseUser.uid);
        }
        setUserDoc(doc);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
