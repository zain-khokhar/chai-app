'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Import providers dynamically with ssr:false to prevent Firebase from
// running during Next.js static page generation
const AuthProvider = dynamic(
  () => import('@/contexts/AuthContext').then((m) => ({ default: m.AuthProvider })),
  { ssr: false }
);

const CartProvider = dynamic(
  () => import('@/contexts/CartContext').then((m) => ({ default: m.CartProvider })),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  );
}
