'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  onOrderSnapshot,
  onOrderEventsSnapshot,
  customerConfirmCash,
} from '@/lib/firestore';
import { OrderDoc, OrderEventDoc } from '@/lib/types';
import {
  formatPKR,
  formatTime,
  getOrderStatusLabel,
} from '@/lib/utils';
import { ArrowLeft, CheckCircle, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CustomerOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const isNew = searchParams.get('new') === '1';
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [events, setEvents] = useState<OrderEventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubOrder = onOrderSnapshot(orderId, (o) => {
      setOrder(o);
      setLoading(false);
    });
    const unsubEvents = onOrderEventsSnapshot(orderId, setEvents);
    return () => {
      unsubOrder();
      unsubEvents();
    };
  }, [orderId]);

  async function handleConfirmCash() {
    if (!user || !order) return;
    setConfirming(true);
    setError('');
    try {
      await customerConfirmCash(orderId, user.uid);
      setConfirmed(true);
    } catch (err: any) {
      setError(err.message ?? 'Failed to confirm. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--milk-cream)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: 'var(--milk-cream)' }}>
        <div className="text-center">
          <p className="text-2xl mb-3">🚫</p>
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Order not found</p>
          <Link href="/customer" className="btn-ghost mt-4 inline-flex">Go home</Link>
        </div>
      </div>
    );
  }

  const isDelivered = order.status === 'DELIVERED';
  const isCashConfirmed = order.cashStatus === 'CUSTOMER_CONFIRMED' || order.cashStatus === 'OWNER_SETTLED';
  const needsCashConfirmation = isDelivered && !isCashConfirmed;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--milk-cream)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 bg-white border-b sticky top-0 z-40"
        style={{ borderColor: 'rgba(139,90,43,0.08)' }}>
        <Link href="/customer" className="btn-ghost p-2 rounded-full">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-title flex-1" style={{ color: 'var(--warm-charcoal)' }}>Order Details</h1>
        <span className={`badge ${
          order.status === 'DELIVERED' ? 'badge-delivered' :
          order.status === 'OUT_FOR_DELIVERY' ? 'badge-out_for_delivery' :
          order.status === 'CANCELLED' ? 'badge-cancelled' :
          'badge-placed'
        }`}>
          {getOrderStatusLabel(order.status)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-8 flex flex-col gap-5">

        {/* ── Delivery Code (shown for non-delivered orders) ── */}
        {!isDelivered && order.status !== 'CANCELLED' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 text-center"
            ref={codeRef}
          >
            {isNew ? (
              <>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--cardamom-green)' }}>
                  ✓ Order Placed!
                </p>
                <h2 className="text-title mb-5" style={{ color: 'var(--warm-charcoal)' }}>
                  Your tea is on the way
                </h2>
              </>
            ) : (
              <h2 className="text-title mb-5" style={{ color: 'var(--warm-charcoal)' }}>
                {getOrderStatusLabel(order.status)}
              </h2>
            )}

            <p className="text-caption mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Delivery Code
            </p>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="delivery-code mb-4"
            >
              {order.deliveryCode}
            </motion.div>
            <p className="text-caption px-6" style={{ color: 'var(--text-tertiary)' }}>
              Share this code only when your tea arrives.
            </p>

            {order.workerName && (
              <p className="text-sm mt-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                🛵 {order.workerName} is on the way
              </p>
            )}
          </motion.div>
        )}

        {/* ── Delivered — Cash Confirmation ── */}
        {isDelivered && (
          <AnimatePresence mode="wait">
            {isCashConfirmed ? (
              <motion.div
                key="confirmed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-6 text-center border-2"
                style={{ borderColor: 'var(--cardamom-green)' }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(75,107,63,0.12)' }}
                >
                  <CheckCircle size={36} color="var(--cardamom-green)" />
                </motion.div>
                <h2 className="text-title mb-2" style={{ color: 'var(--cardamom-green)' }}>
                  Cash Payment Confirmed
                </h2>
                <p className="price-display mb-1">{formatPKR(order.totalAmount)}</p>
                {order.customerConfirmedAt && (
                  <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
                    Confirmed at {formatTime(order.customerConfirmedAt)}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="unconfirmed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <h2 className="text-title mb-2" style={{ color: 'var(--warm-charcoal)' }}>
                  Tea Delivered ☕
                </h2>
                <p className="text-body mb-5" style={{ color: 'var(--text-secondary)' }}>
                  Your order has been delivered.
                </p>

                <div className="card-surface p-4 rounded-xl mb-5 text-center">
                  <p className="text-caption mb-1" style={{ color: 'var(--text-tertiary)' }}>Cash Due</p>
                  <p className="price-display">{formatPKR(order.totalAmount)}</p>
                </div>

                <p className="text-sm font-semibold mb-4 text-center" style={{ color: 'var(--warm-charcoal)' }}>
                  Did you give {formatPKR(order.totalAmount)} to the worker?
                </p>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl mb-4">
                    {error}
                  </p>
                )}

                <motion.button
                  id="confirm-cash"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirmCash}
                  disabled={confirming}
                  className="btn-success w-full mb-3"
                >
                  {confirming ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner border-white/40 border-t-white" style={{ width: 20, height: 20 }} />
                      Confirming…
                    </span>
                  ) : (
                    '✓ Confirm Cash Payment'
                  )}
                </motion.button>

                <button className="btn-ghost w-full text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Not Yet
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ── Order Items ── */}
        <div className="card p-5">
          <h3 className="text-title mb-4" style={{ color: 'var(--warm-charcoal)' }}>Order Items</h3>
          <div className="flex flex-col gap-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b last:border-0"
                style={{ borderColor: 'rgba(139,90,43,0.06)' }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                    {item.qty}× {item.teaType}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {item.size} · {formatPKR(item.price)} each
                  </p>
                </div>
                <p className="font-bold text-sm" style={{ color: 'var(--chai-brown)' }}>
                  {formatPKR(item.lineTotal)}
                </p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold" style={{ color: 'var(--warm-charcoal)' }}>Total</span>
              <span className="price-small">{formatPKR(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* ── Order Timeline ── */}
        <div className="card p-5">
          <h3 className="text-title mb-4" style={{ color: 'var(--warm-charcoal)' }}>Order Timeline</h3>
          <div className="flex flex-col gap-4">
            {events.map((event, i) => (
              <div key={event.id} className="timeline-item">
                {i < events.length - 1 && <div className="timeline-line" />}
                <div className="timeline-dot" style={{
                  background: event.type === 'CUSTOMER_CASH_CONFIRMED' ? 'var(--cardamom-green)' : 'var(--chai-brown)'
                }} />
                <div>
                  <p className="text-caption font-bold" style={{ color: 'var(--text-tertiary)' }}>
                    {formatTime(event.timestamp)}
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--warm-charcoal)' }}>
                    {eventLabel(event.type)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    ORDER_CREATED: 'Order placed',
    ORDER_ACCEPTED: 'Order accepted by shop',
    WORKER_ASSIGNED: 'Worker assigned',
    OUT_FOR_DELIVERY: 'Out for delivery',
    DELIVERY_CODE_VERIFIED: 'Delivery code verified',
    CUSTOMER_CASH_CONFIRMED: 'Customer confirmed cash payment',
    OWNER_CASH_SETTLED: 'Owner recorded settlement',
    ORDER_CANCELLED: 'Order cancelled',
  };
  return labels[type] ?? type;
}
