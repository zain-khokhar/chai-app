'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  onWorkerOrdersSnapshot,
  onCashSettlementsSnapshot,
  getWorkerByUid,
} from '@/lib/firestore';
import { OrderDoc, CashSettlementDoc, WorkerDoc } from '@/lib/types';
import { formatPKR, formatTime, getOrderStatusLabel } from '@/lib/utils';
import { signOut } from '@/lib/auth';
import { Clock, Package, Banknote, User, LogOut, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type Tab = 'today' | 'cash' | 'profile';

export default function WorkerHome() {
  const { user, userDoc } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [settlements, setSettlements] = useState<CashSettlementDoc[]>([]);
  const [worker, setWorker] = useState<WorkerDoc | null>(null);
  const [tab, setTab] = useState<Tab>('today');

  useEffect(() => {
    if (!user) return;
    getWorkerByUid(user.uid).then(setWorker);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub1 = onWorkerOrdersSnapshot(user.uid, setOrders);
    return unsub1;
  }, [user]);

  useEffect(() => {
    if (!worker?.shopId) return;
    const unsub = onCashSettlementsSnapshot(worker.shopId, setSettlements);
    return unsub;
  }, [worker]);

  async function handleLogout() {
    await signOut();
    router.push('/');
  }

  const pending = orders.filter((o) => ['PLACED', 'ACCEPTED', 'ASSIGNED', 'OUT_FOR_DELIVERY'].includes(o.status));
  const completed = orders.filter((o) => o.status === 'DELIVERED');

  // Cash unsettled = customer confirmed but not yet settled
  const confirmedCash = orders
    .filter((o) => o.status === 'DELIVERED' && (o.cashStatus === 'CUSTOMER_CONFIRMED' || o.cashStatus === 'OWNER_SETTLED'))
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const workerSettlements = settlements.filter((s) => s.workerId === user?.uid);
  const settledCash = workerSettlements.reduce((sum, s) => sum + s.amount, 0);
  const unsettledCash = Math.max(0, confirmedCash - settledCash);

  return (
    <div className="min-h-screen" style={{ background: 'var(--milk-cream)' }}>

      {/* Today Tab */}
      {tab === 'today' && (
        <div className="page-content">
          {/* Hero */}
          <div className="gradient-hero px-5 pt-8 pb-10 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-75 mb-1">Good day,</p>
                <h1 className="text-headline text-white">{userDoc?.name ?? 'Worker'}</h1>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Link
                  href="/demo"
                  className="text-xs px-2.5 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
                >
                  Demo
                </Link>
                <button
                  id="worker-logout"
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
                  title="Sign Out"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
            <div className="flex gap-4 mt-5">
              <div className="bg-white/20 backdrop-blur rounded-2xl p-4 flex-1 text-center">
                <p className="text-2xl font-black">{pending.length}</p>
                <p className="text-xs font-medium opacity-75 mt-0.5">Pending</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-2xl p-4 flex-1 text-center">
                <p className="text-2xl font-black">{completed.length}</p>
                <p className="text-xs font-medium opacity-75 mt-0.5">Completed</p>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="px-5 -mt-5">
            <h2 className="text-title mb-3" style={{ color: 'var(--warm-charcoal)' }}>Today's Deliveries</h2>
            <div className="flex flex-col gap-3">
              {orders.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-2xl mb-2">📦</p>
                  <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No deliveries assigned</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Ask the owner to assign orders</p>
                </div>
              ) : (
                orders.slice(0, 10).map((order, i) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link href={`/worker/delivery/${order.id}`} className="block">
                      <div className="card p-4 hover:shadow-md transition-all active:scale-[0.99]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                              {order.customerName}
                            </p>
                            <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-tertiary)' }}>
                              {order.items.map((i) => `${i.qty}× ${i.teaType}`).join(', ')}
                            </p>
                            <span className={`badge ${
                              order.status === 'DELIVERED' ? 'badge-delivered' :
                              order.status === 'OUT_FOR_DELIVERY' ? 'badge-out_for_delivery' :
                              'badge-assigned'
                            }`}>
                              {getOrderStatusLabel(order.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="price-small">{formatPKR(order.totalAmount)}</p>
                            <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cash Tab */}
      {tab === 'cash' && (
        <div className="page-content">
          <div className="px-5 pt-8 pb-4">
            <h1 className="text-headline" style={{ color: 'var(--warm-charcoal)' }}>Cash With You</h1>
          </div>
          <div className="px-5 flex flex-col gap-4">
            {/* Big Cash Display */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="gradient-hero text-white p-6 rounded-2xl text-center"
            >
              <p className="text-sm font-medium opacity-75 mb-2">Unsettled Cash</p>
              <p className="text-4xl font-black mb-1">{formatPKR(unsettledCash)}</p>
              <p className="text-xs opacity-60">Hand this to the owner</p>
            </motion.div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Delivered', value: String(completed.length) },
                { label: 'Confirmed', value: String(orders.filter(o => o.cashStatus === 'CUSTOMER_CONFIRMED' || o.cashStatus === 'OWNER_SETTLED').length) },
                { label: 'Unsettled', value: formatPKR(unsettledCash) },
              ].map((stat) => (
                <div key={stat.label} className="stat-card text-center">
                  <p className="stat-value text-xl">{stat.value}</p>
                  <p className="stat-label">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent confirmed orders */}
            <h3 className="text-title mt-2" style={{ color: 'var(--warm-charcoal)' }}>Customer-Confirmed</h3>
            <div className="flex flex-col gap-2">
              {orders.filter(o => o.cashStatus === 'CUSTOMER_CONFIRMED').length === 0 ? (
                <div className="card p-5 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No customer-confirmed cash yet</p>
                </div>
              ) : (
                orders
                  .filter(o => o.cashStatus === 'CUSTOMER_CONFIRMED' || o.cashStatus === 'OWNER_SETTLED')
                  .map((order) => (
                    <div key={order.id} className="card p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                            {order.customerName}
                          </p>
                          {order.customerConfirmedAt && (
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              {formatTime(order.customerConfirmedAt)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold" style={{ color: 'var(--chai-brown)' }}>{formatPKR(order.totalAmount)}</p>
                          <span className="badge badge-confirmed text-xs">Confirmed</span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="page-content">
          <div className="px-5 pt-8 pb-4">
            <h1 className="text-headline" style={{ color: 'var(--warm-charcoal)' }}>Profile</h1>
          </div>
          <div className="px-5">
            <div className="card p-5 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                  style={{ background: 'var(--milk-cream-dark)' }}>
                  🛵
                </div>
                <div>
                  <p className="font-bold text-base" style={{ color: 'var(--warm-charcoal)' }}>{userDoc?.name}</p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{userDoc?.phone}</p>
                  {worker?.zone && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--chai-brown)' }}>Zone: {worker.zone}</p>
                  )}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-ghost w-full flex items-center gap-3 text-red-600 py-4">
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="flex items-center justify-around">
          {[
            { id: 'today' as Tab, label: 'Today', icon: Clock },
            { id: 'cash' as Tab, label: 'Cash', icon: Banknote },
            { id: 'profile' as Tab, label: 'Profile', icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`worker-nav-${id}`}
              onClick={() => setTab(id)}
              className={`bottom-nav-item ${tab === id ? 'active' : ''}`}
            >
              <Icon size={22} strokeWidth={tab === id ? 2.5 : 1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
