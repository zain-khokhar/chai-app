'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { onOrderSnapshot, startDelivery, verifyDeliveryCode, onOrderEventsSnapshot } from '@/lib/firestore';
import { OrderDoc, OrderEventDoc } from '@/lib/types';
import { formatPKR, formatTime, getOrderStatusLabel } from '@/lib/utils';
import { ArrowLeft, Check, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function WorkerDeliveryPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [events, setEvents] = useState<OrderEventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState(['', '', '', '']);
  const [codeError, setCodeError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [starting, setStarting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  const MAX_ATTEMPTS = 5;

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

  function handleCodeInput(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    setCodeError('');
    if (val && i < 3) {
      inputRefs.current[i + 1]?.focus();
    }
  }

  function handleCodeKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  async function handleStartDelivery() {
    if (!user) return;
    setStarting(true);
    try {
      await startDelivery(orderId, user.uid);
    } finally {
      setStarting(false);
    }
  }

  async function handleVerifyCode() {
    if (!user) return;
    const enteredCode = code.join('');
    if (enteredCode.length !== 4) {
      setCodeError('Enter all 4 digits');
      return;
    }

    if (failCount >= MAX_ATTEMPTS) {
      setCodeError('Too many failed attempts. Contact the owner.');
      return;
    }

    setVerifying(true);
    setCodeError('');
    try {
      const correct = await verifyDeliveryCode(orderId, enteredCode, user.uid);
      if (correct) {
        setCode(['', '', '', '']);
        // Order will update via onSnapshot
      } else {
        const newCount = failCount + 1;
        setFailCount(newCount);
        setCodeError(
          newCount >= MAX_ATTEMPTS
            ? 'Too many failed attempts. Contact the owner.'
            : `Incorrect delivery code. ${MAX_ATTEMPTS - newCount} attempt${MAX_ATTEMPTS - newCount === 1 ? '' : 's'} left.`
        );
        setCode(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setVerifying(false);
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
          <Link href="/worker" className="btn-ghost mt-4 inline-flex">Go back</Link>
        </div>
      </div>
    );
  }

  const isDelivered = order.status === 'DELIVERED';
  const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
  const canStart = order.status === 'ASSIGNED';
  const cashConfirmed = order.cashStatus === 'CUSTOMER_CONFIRMED' || order.cashStatus === 'OWNER_SETTLED';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--milk-cream)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 bg-white border-b sticky top-0 z-40"
        style={{ borderColor: 'rgba(139,90,43,0.08)' }}>
        <Link href="/worker" className="btn-ghost p-2 rounded-full">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-title flex-1" style={{ color: 'var(--warm-charcoal)' }}>Delivery</h1>
        <span className={`badge ${
          isDelivered ? 'badge-delivered' :
          isOutForDelivery ? 'badge-out_for_delivery' :
          'badge-assigned'
        }`}>
          {getOrderStatusLabel(order.status)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-8 flex flex-col gap-5">

        {/* Customer Info */}
        <div className="card p-5">
          <h2 className="text-title mb-1" style={{ color: 'var(--warm-charcoal)' }}>
            {order.customerName}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{order.customerPhone}</p>
          <div className="mt-4 border-t pt-4" style={{ borderColor: 'rgba(139,90,43,0.08)' }}>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-1.5">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {item.qty}× {item.teaType} ({item.size})
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--warm-charcoal)' }}>
                  {formatPKR(item.lineTotal)}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 mt-1 border-t" style={{ borderColor: 'rgba(139,90,43,0.08)' }}>
              <span className="font-bold" style={{ color: 'var(--warm-charcoal)' }}>Total</span>
              <span className="price-small">{formatPKR(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <AnimatePresence mode="wait">
          {isDelivered ? (
            <motion.div
              key="delivered"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-6 text-center"
              style={{ borderColor: 'var(--cardamom-green)', borderWidth: 2 }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(75,107,63,0.12)' }}>
                <Check size={32} color="var(--cardamom-green)" />
              </div>
              <h2 className="text-title mb-1" style={{ color: 'var(--cardamom-green)' }}>
                Delivery Confirmed
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Delivery code was verified successfully.
              </p>
              {order.deliveredAt && (
                <p className="text-caption mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  {formatTime(order.deliveredAt)}
                </p>
              )}

              {/* Cash status for worker */}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(75,107,63,0.15)' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--warm-charcoal)' }}>
                  Cash Collection
                </p>
                {cashConfirmed ? (
                  <div className="flex items-center justify-center gap-2">
                    <Check size={16} color="var(--cardamom-green)" />
                    <span className="text-sm font-bold" style={{ color: 'var(--cardamom-green)' }}>
                      Customer confirmed {formatPKR(order.totalAmount)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle size={16} color="var(--turmeric-gold-dark)" />
                    <span className="text-sm" style={{ color: 'var(--turmeric-gold-dark)' }}>
                      Waiting for customer to confirm cash
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ) : canStart ? (
            <motion.div key="start" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
              <h3 className="text-title mb-2" style={{ color: 'var(--warm-charcoal)' }}>Ready to deliver?</h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                Tap to start delivery and head to the customer.
              </p>
              <motion.button
                id="start-delivery"
                whileTap={{ scale: 0.97 }}
                onClick={handleStartDelivery}
                disabled={starting}
                className="btn-primary w-full"
              >
                {starting ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner border-white/40 border-t-white" style={{ width: 20, height: 20 }} />
                    Starting…
                  </span>
                ) : 'Start Delivery'}
              </motion.button>
            </motion.div>
          ) : isOutForDelivery ? (
            <motion.div key="code-entry" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
              <h3 className="text-title mb-2" style={{ color: 'var(--warm-charcoal)' }}>
                Enter Customer Code
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                Ask the customer for their 4-digit delivery code.
              </p>

              <div className="flex gap-3 justify-center mb-5">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    id={`code-digit-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeInput(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className="code-input"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <AnimatePresence>
                {codeError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm font-medium"
                  >
                    <X size={16} />
                    {codeError}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                id="verify-code"
                whileTap={{ scale: 0.97 }}
                onClick={handleVerifyCode}
                disabled={verifying || failCount >= MAX_ATTEMPTS || code.join('').length !== 4}
                className="btn-primary w-full"
              >
                {verifying ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner border-white/40 border-t-white" style={{ width: 20, height: 20 }} />
                    Verifying…
                  </span>
                ) : 'Verify Code'}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="waiting" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="card p-5 text-center">
              <p className="text-2xl mb-2">⏳</p>
              <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Waiting for assignment
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                The owner will assign this order to you soon.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline */}
        {events.length > 0 && (
          <div className="card p-5">
            <h3 className="text-title mb-4" style={{ color: 'var(--warm-charcoal)' }}>Timeline</h3>
            <div className="flex flex-col gap-4">
              {events.map((event, i) => (
                <div key={event.id} className="timeline-item">
                  {i < events.length - 1 && <div className="timeline-line" />}
                  <div className="timeline-dot" />
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
        )}
      </div>
    </div>
  );
}

function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    ORDER_CREATED: 'Order placed by customer',
    ORDER_ACCEPTED: 'Order accepted',
    WORKER_ASSIGNED: 'Assigned to you',
    OUT_FOR_DELIVERY: 'Started delivery',
    DELIVERY_CODE_VERIFIED: 'Delivery code verified ✓',
    CUSTOMER_CASH_CONFIRMED: 'Customer confirmed cash',
    OWNER_CASH_SETTLED: 'Owner settled',
    ORDER_CANCELLED: 'Order cancelled',
  };
  return labels[type] ?? type;
}
