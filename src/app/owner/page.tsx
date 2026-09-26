'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  onShopOrdersSnapshot,
  onWorkersSnapshot,
  onCashSettlementsSnapshot,
  computeWorkerCashSummaries,
  recordCashSettlement,
  acceptOrder,
  assignWorkerToOrder,
} from '@/lib/firestore';
import { OrderDoc, WorkerDoc, CashSettlementDoc, WorkerCashSummary } from '@/lib/types';
import { formatPKR, formatTime, getOrderStatusLabel } from '@/lib/utils';
import { getTodayStart } from '@/lib/firestore';
import { signOut } from '@/lib/auth';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  CheckCircle,
  X,
} from 'lucide-react';

type Tab = 'dashboard' | 'orders' | 'workers' | 'cash';

export default function OwnerHome() {
  const { user, userDoc } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [workers, setWorkers] = useState<WorkerDoc[]>([]);
  const [settlements, setSettlements] = useState<CashSettlementDoc[]>([]);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [settleModal, setSettleModal] = useState<WorkerCashSummary | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settling, setSettling] = useState(false);
  const [assignModal, setAssignModal] = useState<OrderDoc | null>(null);
  const [assigning, setAssigning] = useState(false);
  const activeShopId = userDoc?.shopId || 'demo-multan-chai-point';

  useEffect(() => {
    const u1 = onShopOrdersSnapshot(activeShopId, setOrders);
    const u2 = onWorkersSnapshot(activeShopId, setWorkers);
    const u3 = onCashSettlementsSnapshot(activeShopId, setSettlements);
    return () => { u1(); u2(); u3(); };
  }, [activeShopId]);

  // For prototype, show all orders so timezone never hides freshly placed orders
  const todayOrders = orders;
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const activeWorkers = workers.filter((w) => w.active).length;
  const pendingCash = orders
    .filter((o) => o.cashStatus === 'CUSTOMER_CONFIRMED')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const cashSummaries = computeWorkerCashSummaries(orders, settlements);

  async function handleAcceptAndAssign(order: OrderDoc, workerId: string, workerName: string) {
    if (!user) return;
    setAssigning(true);
    try {
      if (order.status === 'PLACED') await acceptOrder(order.id, user.uid);
      await assignWorkerToOrder(order.id, workerId, workerName, user.uid);
      setAssignModal(null);
    } finally {
      setAssigning(false);
    }
  }

  async function handleSettle() {
    if (!user || !settleModal) return;
    const amount = parseInt(settleAmount);
    if (isNaN(amount) || amount <= 0) return;
    setSettling(true);
    try {
      await recordCashSettlement({
        shopId: activeShopId,
        workerId: settleModal.workerId,
        workerName: settleModal.workerName,
        amount,
        ownerUid: user.uid,
      });
      setSettleModal(null);
      setSettleAmount('');
    } finally {
      setSettling(false);
    }
  }

  async function handleLogout() {
    await signOut();
    router.push('/');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--milk-cream)' }}>

      {/* ── Dashboard Tab ── */}
      {tab === 'dashboard' && (
        <div className="page-content">
          <div className="gradient-hero px-5 pt-8 pb-10 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-75 mb-0.5">Owner Dashboard</p>
                <h1 className="text-headline text-white">{userDoc?.name ?? 'Chai Point Owner'}</h1>
                <p className="text-xs opacity-60 mt-0.5">Multan Chai Point</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/demo"
                  className="text-xs px-2.5 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
                >
                  Demo Switcher
                </Link>
                <button
                  id="owner-logout"
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
                  title="Sign Out"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 -mt-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Orders', value: String(todayOrders.length), icon: '📦' },
                { label: 'Revenue', value: formatPKR(todayRevenue), icon: '💰' },
                { label: 'Active Workers', value: String(activeWorkers), icon: '🛵' },
                { label: 'Cash Pending', value: formatPKR(pendingCash), icon: '🧾', highlight: true },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="stat-card"
                  style={stat.highlight && pendingCash > 0 ? { borderLeft: '3px solid var(--turmeric-gold)' } : {}}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-lg">{stat.icon}</p>
                  </div>
                  <p className="stat-value" style={{ fontSize: stat.value.length > 7 ? '1.2rem' : '1.5rem' }}>
                    {stat.value}
                  </p>
                  <p className="stat-label">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Cash Reconciliation Preview */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-title" style={{ color: 'var(--warm-charcoal)' }}>Cash Reconciliation</h2>
              <button onClick={() => setTab('cash')} className="text-sm font-semibold" style={{ color: 'var(--chai-brown)' }}>
                View All
              </button>
            </div>

            {cashSummaries.length === 0 ? (
              <div className="card p-5 text-center mb-4">
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No deliveries yet</p>
              </div>
            ) : (
              cashSummaries.slice(0, 2).map((s) => (
                <div key={s.workerId} className="card p-4 mb-3">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold" style={{ color: 'var(--warm-charcoal)' }}>{s.workerName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {s.deliveredOrders} order{s.deliveredOrders !== 1 ? 's' : ''} delivered
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Outstanding</p>
                      <p className="font-bold text-lg" style={{
                        color: s.outstandingCash > 0 ? '#B91C1C' : 'var(--cardamom-green)'
                      }}>
                        {formatPKR(s.outstandingCash)}
                      </p>
                    </div>
                  </div>
                  {s.outstandingCash > 0 && (
                    <button
                      onClick={() => { setSettleModal(s); setSettleAmount(String(s.outstandingCash)); }}
                      className="btn-primary w-full text-sm"
                      style={{ minHeight: 40 }}
                    >
                      Receive Cash from {s.workerName}
                    </button>
                  )}
                </div>
              ))
            )}

            {/* Recent Orders */}
            <div className="flex items-center justify-between mb-3 mt-2">
              <h2 className="text-title" style={{ color: 'var(--warm-charcoal)' }}>Recent Orders</h2>
              <button onClick={() => setTab('orders')} className="text-sm font-semibold" style={{ color: 'var(--chai-brown)' }}>
                View All
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {todayOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                        {order.customerName}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {order.items.map(i => `${i.qty}× ${i.teaType}`).join(', ')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="font-bold text-sm" style={{ color: 'var(--chai-brown)' }}>
                        {formatPKR(order.totalAmount)}
                      </p>
                      <span className={`badge ${
                        order.status === 'DELIVERED' ? 'badge-delivered' :
                        order.status === 'OUT_FOR_DELIVERY' ? 'badge-out_for_delivery' :
                        'badge-placed'
                      }`}>
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                  {/* Assign worker if placed and no worker assigned */}
                  {(order.status === 'PLACED' || order.status === 'ACCEPTED') && workers.length > 0 && (
                    <button
                      onClick={() => setAssignModal(order)}
                      className="btn-secondary w-full text-sm mt-3"
                      style={{ minHeight: 36, borderRadius: 8 }}
                    >
                      Assign Worker
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Orders Tab ── */}
      {tab === 'orders' && (
        <div className="page-content">
          <div className="px-5 pt-8 pb-4">
            <h1 className="text-headline" style={{ color: 'var(--warm-charcoal)' }}>All Orders</h1>
          </div>
          <div className="px-5 flex flex-col gap-3">
            {orders.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-2xl mb-2">📭</p>
                <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No orders yet</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                        {order.customerName}
                      </p>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                        {formatTime(order.createdAt)} · {order.items.map(i => `${i.qty}× ${i.teaType}`).join(', ')}
                      </p>
                      {order.workerName && (
                        <p className="text-xs font-medium" style={{ color: 'var(--chai-brown)' }}>
                          🛵 {order.workerName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="font-bold" style={{ color: 'var(--chai-brown)' }}>{formatPKR(order.totalAmount)}</p>
                      <span className={`badge ${
                        order.status === 'DELIVERED' ? 'badge-delivered' :
                        order.status === 'OUT_FOR_DELIVERY' ? 'badge-out_for_delivery' :
                        order.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-placed'
                      }`}>
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {order.cashStatus === 'CUSTOMER_CONFIRMED' && (
                      <span className="badge badge-confirmed">Cash Confirmed</span>
                    )}
                    {order.cashStatus === 'AWAITING_CUSTOMER_CONFIRMATION' && order.status === 'DELIVERED' && (
                      <span className="badge badge-pending">Awaiting Cash Confirm</span>
                    )}
                    {order.cashStatus === 'OWNER_SETTLED' && (
                      <span className="badge" style={{ background: '#e8f4fd', color: '#1a6fa5' }}>Settled</span>
                    )}
                  </div>
                  {(order.status === 'PLACED' || order.status === 'ACCEPTED') && workers.length > 0 && (
                    <button onClick={() => setAssignModal(order)} className="btn-secondary w-full text-sm mt-3" style={{ minHeight: 36, borderRadius: 8 }}>
                      Assign Worker
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Workers Tab ── */}
      {tab === 'workers' && (
        <div className="page-content">
          <div className="px-5 pt-8 pb-4">
            <h1 className="text-headline" style={{ color: 'var(--warm-charcoal)' }}>Workers</h1>
          </div>
          <div className="px-5 flex flex-col gap-3">
            {workers.map((worker) => (
              <div key={worker.id} className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                    style={{ background: 'var(--milk-cream-dark)' }}>
                    🛵
                  </div>
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: 'var(--warm-charcoal)' }}>{worker.name}</p>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{worker.phone}</p>
                    <p className="text-xs" style={{ color: 'var(--chai-brown)' }}>Zone: {worker.zone}</p>
                  </div>
                  <span className={`badge ${worker.active ? 'badge-delivered' : 'badge-cancelled'}`}>
                    {worker.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cash Reconciliation Tab ── */}
      {tab === 'cash' && (
        <div className="page-content">
          <div className="px-5 pt-8 pb-4">
            <h1 className="text-headline" style={{ color: 'var(--warm-charcoal)' }}>Cash Reconciliation</h1>
          </div>
          <div className="px-5 flex flex-col gap-4">
            {cashSummaries.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-2xl mb-2">💰</p>
                <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No delivery data yet</p>
              </div>
            ) : (
              cashSummaries.map((s) => (
                <motion.div
                  key={s.workerId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-5"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-title" style={{ color: 'var(--warm-charcoal)' }}>{s.workerName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {s.deliveredOrders} order{s.deliveredOrders !== 1 ? 's' : ''} delivered
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Outstanding</p>
                      <p className="text-xl font-black" style={{
                        color: s.outstandingCash > 0 ? '#B91C1C' : 'var(--cardamom-green)'
                      }}>
                        {formatPKR(s.outstandingCash)}
                      </p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="flex flex-col gap-2 mb-4">
                    {[
                      { label: 'Expected Cash', value: formatPKR(s.expectedCash) },
                      { label: 'Customer Confirmed', value: formatPKR(s.customerConfirmedCash), highlight: true },
                      { label: 'Settled with Owner', value: formatPKR(s.settledCash) },
                      { label: 'Still Outstanding', value: formatPKR(s.outstandingCash), bold: true, red: s.outstandingCash > 0 },
                    ].map(({ label, value, highlight, bold, red }) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b last:border-0"
                        style={{ borderColor: 'rgba(139,90,43,0.06)' }}>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                        <span className="text-sm" style={{
                          fontWeight: bold ? 700 : 600,
                          color: red ? '#B91C1C' : highlight ? 'var(--cardamom-green)' : 'var(--warm-charcoal)'
                        }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {s.outstandingCash > 0 && (
                    <motion.button
                      id={`settle-${s.workerId}`}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setSettleModal(s); setSettleAmount(String(s.outstandingCash)); }}
                      className="btn-primary w-full text-sm"
                    >
                      Receive {formatPKR(s.outstandingCash)} from {s.workerName}
                    </motion.button>
                  )}

                  {s.outstandingCash === 0 && s.settledCash > 0 && (
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--cardamom-green)' }}>
                      <CheckCircle size={16} />
                      Fully settled
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}

      {/* Settlement Modal */}
      {/* Settle Modal */}
      <AnimatePresence>
        {settleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            style={{ background: 'rgba(43,27,18,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setSettleModal(null); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-12 shadow-2xl relative z-[101]"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-title" style={{ color: 'var(--warm-charcoal)' }}>
                  Receive Cash from {settleModal.workerName}
                </h2>
                <button onClick={() => setSettleModal(null)} className="p-2 rounded-full hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-5">
                <label className="input-label">Amount (PKR)</label>
                <input
                  id="settle-amount"
                  type="number"
                  inputMode="numeric"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="input-field"
                  placeholder={String(settleModal.outstandingCash)}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  Outstanding: {formatPKR(settleModal.outstandingCash)}
                </p>
              </div>

              <button
                id="confirm-settlement"
                onClick={handleSettle}
                disabled={settling}
                className="btn-success w-full"
              >
                {settling ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner border-white/40 border-t-white" style={{ width: 20, height: 20 }} />
                    Confirming…
                  </span>
                ) : `Confirm Settlement of ${settleAmount ? formatPKR(parseInt(settleAmount)) : '—'}`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Worker Modal */}
      <AnimatePresence>
        {assignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            style={{ background: 'rgba(43,27,18,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setAssignModal(null); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-12 shadow-2xl relative z-[101]"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-title" style={{ color: 'var(--warm-charcoal)' }}>Assign Worker</h2>
                <button onClick={() => setAssignModal(null)} className="p-2 rounded-full hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                Order for {assignModal.customerName} · {formatPKR(assignModal.totalAmount)}
              </p>
              <div className="flex flex-col gap-3">
                {workers.filter(w => w.active).map((worker) => (
                  <motion.button
                    key={worker.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAcceptAndAssign(assignModal, worker.id, worker.name)}
                    disabled={assigning}
                    className="card p-4 flex items-center gap-3 text-left hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ background: 'var(--milk-cream-dark)' }}>
                      🛵
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>{worker.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Zone: {worker.zone}</p>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="flex items-center justify-around">
          {[
            { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
            { id: 'orders' as Tab, label: 'Orders', icon: ShoppingBag },
            { id: 'workers' as Tab, label: 'Workers', icon: Users },
            { id: 'cash' as Tab, label: 'Cash', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`owner-nav-${id}`}
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
