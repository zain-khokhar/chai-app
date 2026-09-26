'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { onShopsSnapshot } from '@/lib/firestore';
import { ShopDoc } from '@/lib/types';
import { getGreeting, formatPKR } from '@/lib/utils';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Home, Search, ShoppingBag, User, MapPin, ChevronRight, LogOut, Smartphone } from 'lucide-react';
import { usePWA } from '@/contexts/PWAContext';
import CustomerBottomNav from './CustomerBottomNav';
import CustomerOrdersList from './CustomerOrdersList';

export default function CustomerHome() {
  const { userDoc } = useAuth();
  const { openMobileAppModal } = usePWA();
  const [shops, setShops] = useState<ShopDoc[]>([]);
  const [tab, setTab] = useState<'home' | 'orders' | 'profile'>('home');
  const router = useRouter();

  useEffect(() => {
    const unsub = onShopsSnapshot((data) => setShops(data));
    return unsub;
  }, []);

  async function handleLogout() {
    await signOut();
    router.push('/');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--milk-cream)' }}>
      {/* Home Tab */}
      {tab === 'home' && (
        <div className="page-content">
          {/* Header */}
          <div className="px-5 pt-8 pb-4 flex items-start justify-between">
            <div>
              <p className="text-caption mb-1" style={{ color: 'var(--text-tertiary)' }}>
                {getGreeting()}
              </p>
              <h1 className="text-headline" style={{ color: 'var(--warm-charcoal)' }}>
                {userDoc?.name ?? 'Welcome'}
              </h1>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={openMobileAppModal}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-medium"
                style={{ background: 'var(--milk-cream-dark)', color: 'var(--chai-brown)' }}
                title="Install Mobile App"
              >
                <Smartphone size={13} />
                <span>App</span>
              </button>
              <Link
                href="/demo"
                className="text-xs px-2.5 py-1.5 rounded-full font-medium"
                style={{ background: 'var(--milk-cream-dark)', color: 'var(--chai-brown)' }}
              >
                Demo
              </Link>
              <button
                id="customer-logout"
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-medium"
                style={{ background: 'var(--milk-cream-dark)', color: 'var(--warm-charcoal)' }}
                title="Sign Out"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Section Label */}
          <div className="px-5 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-title" style={{ color: 'var(--warm-charcoal)' }}>
                Tea shops near you
              </h2>
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <MapPin size={12} />
                <span>Multan</span>
              </div>
            </div>
          </div>

          {/* Shops List */}
          <div className="px-5 flex flex-col gap-4">
            {shops.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-2xl mb-3">🫖</p>
                <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  No tea shops found nearby
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Try the demo mode to get started
                </p>
              </div>
            ) : (
              shops.map((shop, i) => (
                <motion.div
                  key={shop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                >
                  <Link href={`/customer/shop/${shop.id}`} className="block">
                    <div className="card p-5 hover:shadow-md transition-all active:scale-[0.99]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-title truncate" style={{ color: 'var(--warm-charcoal)' }}>
                              {shop.shopName}
                            </h3>
                            {shop.open && (
                              <span className="badge badge-delivered text-xs flex-shrink-0">Open</span>
                            )}
                          </div>
                          <p className="text-caption mb-3" style={{ color: 'var(--text-tertiary)' }}>
                            <MapPin size={11} className="inline mr-1" />
                            {shop.area}, Multan
                          </p>
                          <p className="text-sm font-medium" style={{ color: 'var(--chai-brown)' }}>
                            From {formatPKR(shop.minPrice)}
                          </p>
                        </div>

                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                            style={{ background: 'var(--milk-cream-dark)' }}>
                            ☕
                          </div>
                          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--chai-brown)' }}>
                            View Menu <ChevronRight size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="page-content">
          <div className="px-5 pt-8 pb-4">
            <h1 className="text-headline" style={{ color: 'var(--warm-charcoal)' }}>My Orders</h1>
          </div>
          <CustomerOrdersList />
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
                  🧑‍💼
                </div>
                <div>
                  <p className="font-bold text-base" style={{ color: 'var(--warm-charcoal)' }}>
                    {userDoc?.name}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {userDoc?.phone}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-900 text-lg">
                  📱
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                    ChaiKhata Mobile App
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Install on phone home screen
                  </p>
                </div>
              </div>
              <button
                onClick={openMobileAppModal}
                className="btn-primary text-xs py-2 px-3.5"
              >
                Install
              </button>
            </div>

            <button onClick={handleLogout} className="btn-ghost w-full flex items-center gap-3 text-red-600 py-4">
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <CustomerBottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
