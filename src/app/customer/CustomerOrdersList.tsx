'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { onCustomerOrdersSnapshot } from '@/lib/firestore';
import { OrderDoc } from '@/lib/types';
import { formatPKR, formatTime, getOrderStatusLabel, getCashStatusLabel } from '@/lib/utils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Package } from 'lucide-react';

export default function CustomerOrdersList() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = onCustomerOrdersSnapshot(user.uid, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="px-5">
        <div className="card p-8 text-center">
          <p className="text-3xl mb-3">🧾</p>
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No orders yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Browse shops and place your first order!
          </p>
        </div>
      </div>
    );
  }

  function getStatusBadgeClass(status: string): string {
    return `badge badge-${status.toLowerCase().replace(/_/g, '_')}`;
  }

  return (
    <div className="px-5 flex flex-col gap-3">
      <AnimatePresence>
        {orders.map((order, i) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link href={`/customer/order/${order.id}`} className="block">
              <div className="card p-4 hover:shadow-md transition-all active:scale-[0.99]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                      {order.items.map(i => `${i.qty}× ${i.teaType}`).join(', ')}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {formatTime(order.createdAt)}
                    </p>
                  </div>
                  <p className="price-small">{formatPKR(order.totalAmount)}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${
                    order.status === 'DELIVERED' ? 'badge-delivered' :
                    order.status === 'OUT_FOR_DELIVERY' ? 'badge-out_for_delivery' :
                    order.status === 'CANCELLED' ? 'badge-cancelled' :
                    'badge-placed'
                  }`}>
                    {getOrderStatusLabel(order.status)}
                  </span>

                  {order.status === 'DELIVERED' && (
                    <span className={`badge ${
                      order.cashStatus === 'CUSTOMER_CONFIRMED' ? 'badge-confirmed' : 'badge-pending'
                    }`}>
                      {order.cashStatus === 'CUSTOMER_CONFIRMED' ? 'Cash Confirmed' : 'Confirm Cash'}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
