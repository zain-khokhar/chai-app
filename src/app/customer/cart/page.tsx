'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { createOrder } from '@/lib/firestore';
import { formatPKR } from '@/lib/utils';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get('shopId') || 'demo-multan-chai-point';
  const { user, userDoc } = useAuth();
  const { items, updateQty, removeItem, clearCart, totalAmount } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePlaceOrder() {
    if (!user || !userDoc) return;
    if (items.length === 0) return;

    setLoading(true);
    setError('');
    try {
      const orderItems = items.map((item) => ({
        itemId: item.itemId,
        teaType: item.teaType,
        size: item.size,
        price: item.price, // snapshot
        qty: item.qty,
        lineTotal: item.price * item.qty,
      }));

      // Total is always computed server-side from snapshots; never trust client input
      const computedTotal = orderItems.reduce((s, i) => s + i.lineTotal, 0);

      const { orderId, deliveryCode } = await createOrder({
        customerId: user.uid,
        customerName: userDoc.name,
        customerPhone: userDoc.phone,
        shopId,
        items: orderItems,
        totalAmount: computedTotal,
      });

      clearCart();
      router.push(`/customer/order/${orderId}?code=${deliveryCode}&new=1`);
    } catch (err: any) {
      setError('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--milk-cream)' }}>
        <div className="flex items-center gap-3 p-5">
          <Link href={shopId ? `/customer/shop/${shopId}` : '/customer'} className="btn-ghost p-2 rounded-full">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-title" style={{ color: 'var(--warm-charcoal)' }}>Your Cart</h1>
        </div>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="card p-8 text-center w-full">
            <p className="text-3xl mb-3">🛒</p>
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Your cart is empty</p>
            <Link href={shopId ? `/customer/shop/${shopId}` : '/customer'}
              className="btn-primary inline-flex mt-5 text-sm">
              Browse Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--milk-cream)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 bg-white border-b" style={{ borderColor: 'rgba(139,90,43,0.08)' }}>
        <Link href={shopId ? `/customer/shop/${shopId}` : '/customer'} className="btn-ghost p-2 rounded-full">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-title flex-1" style={{ color: 'var(--warm-charcoal)' }}>Your Cart</h1>
        <button onClick={clearCart} className="btn-ghost text-red-500 p-2 rounded-full text-sm">
          Clear
        </button>
      </div>

      {/* Cart Items */}
      <div className="flex-1 px-5 pt-5 pb-36 overflow-y-auto">
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.itemId}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16, height: 0 }}
                className="card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                      {item.teaType}
                    </p>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                      {item.size} · {formatPKR(item.price)} each
                    </p>
                    <p className="font-bold" style={{ color: 'var(--chai-brown)' }}>
                      {formatPKR(item.price * item.qty)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="qty-stepper">
                      <button className="qty-btn minus" onClick={() => updateQty(item.itemId, item.qty - 1)}>−</button>
                      <span className="qty-value">{item.qty}</span>
                      <button className="qty-btn plus" onClick={() => updateQty(item.itemId, item.qty + 1)}>+</button>
                    </div>
                    <button onClick={() => removeItem(item.itemId)} className="text-red-400 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="card p-5 mt-4">
          <h3 className="text-title mb-4" style={{ color: 'var(--warm-charcoal)' }}>Order Summary</h3>
          {items.map((item) => (
            <div key={item.itemId} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'rgba(139,90,43,0.06)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {item.qty}× {item.teaType} ({item.size})
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--warm-charcoal)' }}>
                {formatPKR(item.price * item.qty)}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-3 mt-1">
            <span className="text-title" style={{ color: 'var(--warm-charcoal)' }}>Total</span>
            <span className="price-display">{formatPKR(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3"
        style={{ background: 'linear-gradient(to top, var(--milk-cream) 70%, transparent)' }}>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl mb-3 text-center">
            {error}
          </p>
        )}
        <motion.button
          id="place-order"
          whileTap={{ scale: 0.98 }}
          onClick={handlePlaceOrder}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="spinner border-white/40 border-t-white" style={{ width: 20, height: 20 }} />
              Placing Order…
            </span>
          ) : (
            <>Place Order · {formatPKR(totalAmount)}</>
          )}
        </motion.button>
      </div>
    </div>
  );
}
