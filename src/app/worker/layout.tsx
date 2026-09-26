'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !userDoc) {
      router.replace('/');
      return;
    }
    if (userDoc.role !== 'WORKER') {
      if (userDoc.role === 'CUSTOMER') router.replace('/customer');
      else if (userDoc.role === 'OWNER') router.replace('/owner');
    }
  }, [user, userDoc, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--milk-cream)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return <div className="app-shell">{children}</div>;
}
