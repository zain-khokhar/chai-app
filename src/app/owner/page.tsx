'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  onShopOrdersSnapshot,
  onWorkersSnapshot,
  onCashSettlementsSnapshot,
  onMenuItemsSnapshot,
  computeWorkerCashSummaries,
  recordCashSettlement,
  acceptOrder,
  assignWorkerToOrder,
  upsertMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  loadDefaultMenuForShop,
  toggleWorkerActive,
  deleteWorker,
} from '@/lib/firestore';
import {
  OrderDoc,
  WorkerDoc,
  CashSettlementDoc,
  WorkerCashSummary,
  MenuItemDoc,
} from '@/lib/types';
import { formatPKR, formatTime, getOrderStatusLabel, isValidPakistaniPhone, isValidPIN } from '@/lib/utils';
import { signOut, createWorkerAccount } from '@/lib/auth';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Banknote,
  Coffee,
  LogOut,
  ChevronRight,
  CheckCircle,
  X,
  Smartphone,
  Plus,
  Trash2,
  Edit2,
  Check,
  RefreshCw,
  Sparkles,
  Phone,
  MapPin,
  Lock,
} from 'lucide-react';
import { usePWA } from '@/contexts/PWAContext';

type Tab = 'dashboard' | 'orders' | 'menu' | 'workers' | 'cash';

const POPULAR_TEAS = [
  'Doodh Patti',
  'Karak Chai',
  'Kashmiri Chai',
  'Sabz Chai / Kehwa',
  'Elaichi Chai',
  'Adrak Chai',
  'Lipton / Black Tea',
];

export default function OwnerHome() {
  const { user, userDoc } = useAuth();
  const { openMobileAppModal } = usePWA();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [workers, setWorkers] = useState<WorkerDoc[]>([]);
  const [settlements, setSettlements] = useState<CashSettlementDoc[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemDoc[]>([]);
  const [tab, setTab] = useState<Tab>('dashboard');

  // Settlement modal state
  const [settleModal, setSettleModal] = useState<WorkerCashSummary | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settling, setSettling] = useState(false);

  // Assign modal state
  const [assignModal, setAssignModal] = useState<OrderDoc | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Menu Modal State
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemDoc | null>(null);
  const [teaType, setTeaType] = useState('Doodh Patti');
  const [teaSize, setTeaSize] = useState<'Chota Cup' | 'Bara Cup'>('Chota Cup');
  const [teaPrice, setTeaPrice] = useState('40');
  const [teaAvailable, setTeaAvailable] = useState(true);
  const [savingMenu, setSavingMenu] = useState(false);
  const [loadingPresetMenu, setLoadingPresetMenu] = useState(false);

  // Worker Modal State
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerPin, setWorkerPin] = useState('');
  const [workerZone, setWorkerZone] = useState('Gulgasht');
  const [savingWorker, setSavingWorker] = useState(false);
  const [workerError, setWorkerError] = useState('');
  const [workerSuccess, setWorkerSuccess] = useState('');

  const activeShopId = userDoc?.shopId || 'demo-multan-chai-point';

  useEffect(() => {
    const u1 = onShopOrdersSnapshot(activeShopId, setOrders);
    const u2 = onWorkersSnapshot(activeShopId, setWorkers);
    const u3 = onCashSettlementsSnapshot(activeShopId, setSettlements);
    const u4 = onMenuItemsSnapshot(activeShopId, setMenuItems);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [activeShopId]);

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

  // ── Menu Handlers ──────────────────────────────────────────
  function openAddMenuModal() {
    setEditingItem(null);
    setTeaType('Doodh Patti');
    setTeaSize('Chota Cup');
    setTeaPrice('40');
    setTeaAvailable(true);
    setMenuModalOpen(true);
  }

  function openEditMenuModal(item: MenuItemDoc) {
    setEditingItem(item);
    setTeaType(item.teaType);
    setTeaSize(item.size);
    setTeaPrice(String(item.price));
    setTeaAvailable(item.available);
    setMenuModalOpen(true);
  }

  async function handleSaveMenuItem() {
    if (!teaType.trim()) return;
    const priceNum = parseInt(teaPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    setSavingMenu(true);
    try {
      await upsertMenuItem(activeShopId, {
        ...(editingItem ? { id: editingItem.id } : {}),
        teaType: teaType.trim(),
        size: teaSize,
        price: priceNum,
        available: teaAvailable,
      });
      setMenuModalOpen(false);
    } finally {
      setSavingMenu(false);
    }
  }

  async function handleLoadDefaultMenu() {
    setLoadingPresetMenu(true);
    try {
      await loadDefaultMenuForShop(activeShopId);
    } finally {
      setLoadingPresetMenu(false);
    }
  }

  // ── Worker Handlers ────────────────────────────────────────
  function openAddWorkerModal() {
    setWorkerName('');
    setWorkerPhone('');
    setWorkerPin('');
    setWorkerZone('Gulgasht');
    setWorkerError('');
    setWorkerSuccess('');
    setWorkerModalOpen(true);
  }

  async function handleSaveWorker() {
    setWorkerError('');
    setWorkerSuccess('');

    if (!workerName.trim() || workerName.trim().length < 2) {
      setWorkerError('Enter worker full name');
      return;
    }
    if (!isValidPakistaniPhone(workerPhone)) {
      setWorkerError('Enter a valid Pakistani phone number (03XXXXXXXXX)');
      return;
    }
    if (!isValidPIN(workerPin)) {
      setWorkerError('PIN must be exactly 6 digits');
      return;
    }

    setSavingWorker(true);
    try {
      await createWorkerAccount({
        shopId: activeShopId,
        name: workerName.trim(),
        phone: workerPhone.trim(),
        pin: workerPin.trim(),
        zone: workerZone.trim() || 'Multan',
      });
      setWorkerSuccess(`Worker ${workerName.trim()} created! Login: ${workerPhone.trim()} · PIN: ${workerPin.trim()}`);
      setTimeout(() => {
        setWorkerModalOpen(false);
      }, 1800);
    } catch (err: any) {
      setWorkerError(err.message || 'Failed to create worker account');
    } finally {
      setSavingWorker(false);
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--milk-cream)' }}>

      {/* ── Dashboard Tab ── */}
      {tab === 'dashboard' && (
        <div className="page-content">
          <div className="gradient-hero px-5 pt-8 pb-10 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-75 mb-0.5">Owner Dashboard</p>
                <h1 className="text-headline text-white">{userDoc?.name ?? 'Chai Point Owner'}</h1>
                <p className="text-xs opacity-60 mt-0.5">Shop ID: {activeShopId}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openMobileAppModal}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
                  title="Install Mobile App"
                >
                  <Smartphone size={13} />
                  <span>App</span>
                </button>
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
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="card p-4">
                <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Total Revenue</p>
                <p className="text-2xl font-black mt-1" style={{ color: 'var(--warm-charcoal)' }}>
                  {formatPKR(todayRevenue)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {todayOrders.length} order{todayOrders.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="card p-4">
                <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Pending Cash</p>
                <p className="text-2xl font-black mt-1" style={{
                  color: pendingCash > 0 ? '#B91C1C' : 'var(--cardamom-green)'
                }}>
                  {formatPKR(pendingCash)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {cashSummaries.filter(s => s.outstandingCash > 0).length} workers holding
                </p>
              </div>

              <div
                onClick={() => setTab('workers')}
                className="card p-4 cursor-pointer hover:border-amber-300 transition-all"
              >
                <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Workers</p>
                <p className="text-2xl font-black mt-1" style={{ color: 'var(--warm-charcoal)' }}>
                  {workers.length}
                </p>
                <p className="text-xs mt-1 text-emerald-700 font-medium">
                  {activeWorkers} active · Manage →
                </p>
              </div>

              <div
                onClick={() => setTab('menu')}
                className="card p-4 cursor-pointer hover:border-amber-300 transition-all"
              >
                <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Chai Menu</p>
                <p className="text-2xl font-black mt-1" style={{ color: 'var(--warm-charcoal)' }}>
                  {menuItems.length}
                </p>
                <p className="text-xs mt-1 text-amber-800 font-medium">
                  Manage Menu →
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={openAddMenuModal}
                className="card p-3 flex items-center justify-center gap-2 font-bold text-xs hover:bg-amber-50/50 transition-colors"
                style={{ color: 'var(--chai-brown)' }}
              >
                <Coffee size={16} />
                <span>+ Add Tea Item</span>
              </button>
              <button
                onClick={openAddWorkerModal}
                className="card p-3 flex items-center justify-center gap-2 font-bold text-xs hover:bg-amber-50/50 transition-colors"
                style={{ color: 'var(--chai-brown)' }}
              >
                <Users size={16} />
                <span>+ Add Worker</span>
              </button>
            </div>

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

      {/* ── Menu Tab (NEW) ── */}
      {tab === 'menu' && (
        <div className="page-content">
          <div className="px-5 pt-8 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-headline" style={{ color: 'var(--warm-charcoal)' }}>Tea Menu</h1>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {menuItems.length} items on your shop menu
              </p>
            </div>
            <button
              onClick={openAddMenuModal}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5"
            >
              <Plus size={15} />
              <span>Add Tea</span>
            </button>
          </div>

          <div className="px-5 flex flex-col gap-3">
            {menuItems.length === 0 ? (
              <div className="card p-6 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl">
                  ☕
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--warm-charcoal)' }}>
                    Your Menu is Empty
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Customers cannot place orders until you add tea items. You can add items one by one, or load the standard Multan Chai Menu with 1 tap.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <button
                    onClick={handleLoadDefaultMenu}
                    disabled={loadingPresetMenu}
                    className="btn-primary w-full text-xs flex items-center justify-center gap-2 py-3"
                  >
                    <Sparkles size={16} />
                    <span>{loadingPresetMenu ? 'Loading Menu…' : '⚡ Load Standard Multan Menu (14 Items)'}</span>
                  </button>
                  <button
                    onClick={openAddMenuModal}
                    className="btn-secondary w-full text-xs py-2.5"
                  >
                    + Add Custom Tea Item
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Secondary Helper to load standard menu if missing items */}
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200/60 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                    <Sparkles size={14} className="text-amber-700" />
                    <span>Quick presets available</span>
                  </div>
                  <button
                    onClick={handleLoadDefaultMenu}
                    disabled={loadingPresetMenu}
                    className="text-xs font-bold text-amber-800 hover:text-amber-900 underline"
                  >
                    {loadingPresetMenu ? 'Loading…' : 'Load Standard Multan Menu'}
                  </button>
                </div>

                {menuItems.map((item) => (
                  <div key={item.id} className="card p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-amber-100 text-xl flex-shrink-0">
                        ☕
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate" style={{ color: 'var(--warm-charcoal)' }}>
                            {item.teaType}
                          </p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700">
                            {item.size}
                          </span>
                        </div>
                        <p className="font-extrabold text-sm mt-0.5" style={{ color: 'var(--chai-brown)' }}>
                          {formatPKR(item.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Availability Toggle */}
                      <button
                        onClick={() => toggleMenuItemAvailability(activeShopId, item.id, !item.available)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                          item.available
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {item.available ? 'In Stock' : 'Out of Stock'}
                      </button>

                      <button
                        onClick={() => openEditMenuModal(item)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                        title="Edit Item"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        onClick={() => deleteMenuItem(activeShopId, item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                        title="Delete Item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Workers Tab ── */}
      {tab === 'workers' && (
        <div className="page-content">
          <div className="px-5 pt-8 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-headline" style={{ color: 'var(--warm-charcoal)' }}>Workers</h1>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {workers.length} delivery boys registered
              </p>
            </div>
            <button
              onClick={openAddWorkerModal}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5"
            >
              <Plus size={15} />
              <span>Add Worker</span>
            </button>
          </div>

          <div className="px-5 flex flex-col gap-3">
            {workers.length === 0 ? (
              <div className="card p-6 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl">
                  🛵
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--warm-charcoal)' }}>
                    No Delivery Workers Yet
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Add your delivery boys with their name, phone number, and 6-digit PIN. They can log in to the Worker app directly from their phones to receive orders.
                  </p>
                </div>
                <button
                  onClick={openAddWorkerModal}
                  className="btn-primary text-xs py-2.5 px-6"
                >
                  + Add First Delivery Worker
                </button>
              </div>
            ) : (
              workers.map((worker) => (
                <div key={worker.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-blue-50 text-blue-800 flex-shrink-0">
                      🛵
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                          {worker.name}
                        </p>
                        <button
                          onClick={() => toggleWorkerActive(worker.id, !worker.active)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            worker.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}
                        >
                          {worker.active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Phone size={11} /> {worker.phone}
                      </p>
                      <p className="text-xs font-medium mt-0.5 flex items-center gap-1" style={{ color: 'var(--chai-brown)' }}>
                        <MapPin size={11} /> Zone: {worker.zone}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteWorker(worker.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Worker"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span>Login: Phone + 6-digit PIN</span>
                    <span className="font-medium text-amber-800">
                      {orders.filter(o => o.workerId === worker.id && o.status === 'OUT_FOR_DELIVERY').length} in delivery
                    </span>
                  </div>
                </div>
              ))
            )}
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

      {/* 1. Add / Edit Menu Item Modal */}
      <AnimatePresence>
        {menuModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg">
                    ☕
                  </div>
                  <div>
                    <h2 className="text-title" style={{ color: 'var(--warm-charcoal)' }}>
                      {editingItem ? 'Edit Tea Item' : 'Add Tea Item'}
                    </h2>
                    <p className="text-xs text-gray-500">Configure tea & pricing</p>
                  </div>
                </div>
                <button onClick={() => setMenuModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              {/* Popular Chai quick select chips */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                  Quick Select Common Teas:
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {POPULAR_TEAS.map((tea) => (
                    <button
                      key={tea}
                      type="button"
                      onClick={() => setTeaType(tea)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        teaType === tea
                          ? 'bg-amber-800 text-white border-amber-800'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {tea}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="input-label">Tea Name / Type</label>
                  <input
                    type="text"
                    value={teaType}
                    onChange={(e) => setTeaType(e.target.value)}
                    placeholder="e.g. Doodh Patti, Peshawari Kehwa"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Cup Size</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTeaSize('Chota Cup')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        teaSize === 'Chota Cup'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Chota Cup (Regular)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeaSize('Bara Cup')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        teaSize === 'Bara Cup'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Bara Cup (Large)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="input-label">Price (PKR)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={teaPrice}
                    onChange={(e) => setTeaPrice(e.target.value)}
                    placeholder="e.g. 50"
                    className="input-field"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-xs font-bold text-gray-800">Available to Order</p>
                    <p className="text-[11px] text-gray-500">Show on customer menu</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={teaAvailable}
                    onChange={(e) => setTeaAvailable(e.target.checked)}
                    className="w-5 h-5 rounded text-amber-800 focus:ring-amber-800"
                  />
                </div>

                <button
                  onClick={handleSaveMenuItem}
                  disabled={savingMenu || !teaType.trim() || !teaPrice}
                  className="btn-primary w-full py-3 text-sm mt-1"
                >
                  {savingMenu ? 'Saving…' : editingItem ? 'Save Changes' : 'Add to Menu'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Add Worker Modal */}
      <AnimatePresence>
        {workerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWorkerModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-lg">
                    🛵
                  </div>
                  <div>
                    <h2 className="text-title" style={{ color: 'var(--warm-charcoal)' }}>
                      Add Delivery Worker
                    </h2>
                    <p className="text-xs text-gray-500">Creates worker account for this shop</p>
                  </div>
                </div>
                <button onClick={() => setWorkerModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              {workerError && (
                <div className="p-3 mb-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {workerError}
                </div>
              )}

              {workerSuccess && (
                <div className="p-3 mb-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>{workerSuccess}</span>
                </div>
              )}

              <div className="flex flex-col gap-3.5">
                <div>
                  <label className="input-label">Worker Full Name</label>
                  <input
                    type="text"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    placeholder="e.g. Muhammad Bilal"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Phone Number (Login ID)</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    maxLength={11}
                    value={workerPhone}
                    onChange={(e) => setWorkerPhone(e.target.value)}
                    placeholder="03XXXXXXXXX"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">6-Digit PIN (Worker Password)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={workerPin}
                    onChange={(e) => setWorkerPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="input-field"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    The worker will use this 6-digit PIN to log into their app.
                  </p>
                </div>

                <div>
                  <label className="input-label">Assigned Delivery Zone</label>
                  <input
                    type="text"
                    value={workerZone}
                    onChange={(e) => setWorkerZone(e.target.value)}
                    placeholder="e.g. Gulgasht, Bosan Road, Cantt"
                    className="input-field"
                  />
                </div>

                <button
                  onClick={handleSaveWorker}
                  disabled={savingWorker}
                  className="btn-primary w-full py-3 text-sm mt-2"
                >
                  {savingWorker ? 'Creating Worker Account…' : 'Create Worker Account'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Settle Modal */}
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

      {/* 4. Assign Worker Modal */}
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

      {/* ── Bottom Nav ── */}
      <nav className="bottom-nav">
        <div className="flex items-center justify-around">
          {[
            { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
            { id: 'orders' as Tab, label: 'Orders', icon: ShoppingBag },
            { id: 'menu' as Tab, label: 'Menu', icon: Coffee },
            { id: 'workers' as Tab, label: 'Workers', icon: Users },
            { id: 'cash' as Tab, label: 'Cash', icon: Banknote },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`owner-nav-${id}`}
              onClick={() => setTab(id)}
              className={`bottom-nav-item ${tab === id ? 'active' : ''}`}
            >
              <Icon size={20} strokeWidth={tab === id ? 2.5 : 1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
