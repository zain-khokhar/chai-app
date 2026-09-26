'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { seedDemoData, isDemoDataSeeded } from '@/lib/seed';
import { loginUser, DEMO_ACCOUNTS, signOut } from '@/lib/auth';
import { usePWA } from '@/contexts/PWAContext';
import { ArrowLeft, Smartphone, RefreshCw, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

type DemoRole = 'customer' | 'worker' | 'owner';

export default function DemoPage() {
  const router = useRouter();
  const { openMobileAppModal } = usePWA();
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [seeded, setSeeded] = useState(false);
  const [activeRole, setActiveRole] = useState<DemoRole | null>(null);

  useEffect(() => {
    // Check local cache first for instant response
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('chaikhata_demo_seeded');
      if (cached === 'true') {
        setSeeded(true);
      }
    }

    // Verify with Firestore
    isDemoDataSeeded().then((isReady) => {
      if (isReady) {
        setSeeded(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('chaikhata_demo_seeded', 'true');
        }
      }
    });
  }, []);

  async function handleSeed() {
    setSeeding(true);
    setError('');
    try {
      await seedDemoData();
      setSeeded(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chaikhata_demo_seeded', 'true');
      }
    } catch (err: any) {
      setError('Seeding failed: ' + err.message);
    } finally {
      setSeeding(false);
    }
  }

  async function loginAs(role: DemoRole) {
    setLoading(true);
    setActiveRole(role);
    setError('');
    try {
      await signOut();
      const account = DEMO_ACCOUNTS[role];
      try {
        await loginUser(account.phone, account.pin);
      } catch {
        // Auto-seed if account not seeded yet
        await seedDemoData();
        setSeeded(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('chaikhata_demo_seeded', 'true');
        }
        await loginUser(account.phone, account.pin);
      }

      switch (role) {
        case 'customer': router.push('/customer'); break;
        case 'worker': router.push('/worker'); break;
        case 'owner': router.push('/owner'); break;
      }
    } catch (err: any) {
      setError('Login failed: ' + (err.message || 'Please try again.'));
    } finally {
      setLoading(false);
      setActiveRole(null);
    }
  }

  const roleCards = [
    {
      role: 'customer' as DemoRole,
      emoji: '🧑‍💼',
      title: 'Continue as Customer',
      subtitle: 'Ali General Store · 03001234567',
      description: 'Browse menu, place order, receive delivery code, confirm cash',
      gradient: 'from-amber-400 to-orange-400',
    },
    {
      role: 'worker' as DemoRole,
      emoji: '🛵',
      title: 'Continue as Worker',
      subtitle: 'Hamza · 03111234567',
      description: 'See assigned deliveries, enter delivery code',
      gradient: 'from-blue-400 to-cyan-400',
    },
    {
      role: 'owner' as DemoRole,
      emoji: '👔',
      title: 'Continue as Owner',
      subtitle: 'Chai Point Owner · 03211234567',
      description: 'Dashboard, cash reconciliation, settlements',
      gradient: 'from-green-400 to-emerald-400',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--milk-cream)' }}>
      {/* Top Banner */}
      <div className="demo-banner flex items-center justify-between px-4 py-2">
        <span>🧪 DEMO MODE — Prototype Testing</span>
        <button
          onClick={openMobileAppModal}
          className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors"
        >
          <Smartphone size={12} />
          <span>Mobile App</span>
        </button>
      </div>

      <div className="flex-1 px-5 py-6 flex flex-col gap-5 max-w-md mx-auto w-full">
        {/* Navigation & Title */}
        <div className="flex items-center justify-between">
          <Link href="/" className="btn-ghost p-2 -ml-2 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          <button
            onClick={openMobileAppModal}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-800/20 bg-amber-800/5 hover:bg-amber-800/10 transition-colors"
            style={{ color: 'var(--chai-brown)' }}
          >
            <Smartphone size={14} />
            <span>Install App</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-headline mb-1" style={{ color: 'var(--warm-charcoal)' }}>
            Test ChaiKhata
          </h1>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
            Switch between roles to test the full order → delivery → cash confirmation flow.
          </p>
        </motion.div>

        {/* Step 1: Demo Setup Status (Persistent) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="card p-5"
        >
          {seeded ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white bg-emerald-600 flex-shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">
                    Demo Data Ready
                  </p>
                  <p className="text-xs text-emerald-700 font-medium">
                    ✓ Setup completed (1-time only)
                  </p>
                </div>
              </div>
              <button
                id="demo-reseed"
                onClick={handleSeed}
                disabled={seeding}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                title="Re-seed demo data if you want to reset orders"
              >
                <RefreshCw size={12} className={seeding ? 'animate-spin' : ''} />
                <span>{seeding ? 'Resetting…' : 'Reset'}</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: 'var(--chai-brown)' }}
                >
                  1
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                    Setup Demo Data (Required Once)
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Creates shop, menu, and 3 test accounts in Firestore
                  </p>
                </div>
              </div>

              <button
                id="demo-seed"
                onClick={handleSeed}
                disabled={seeding}
                className="btn-primary w-full text-sm"
                style={{ minHeight: 44 }}
              >
                {seeding ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner border-white/40 border-t-white" style={{ width: 16, height: 16 }} />
                    Setting up…
                  </span>
                ) : (
                  'Setup Demo Data'
                )}
              </button>
            </div>
          )}
        </motion.div>

        {/* Step 2: Choose role (Always accessible) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'var(--chai-brown)' }}
            >
              2
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                Login as a Role
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Switch between roles to test the full flow
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {roleCards.map((card) => (
              <motion.button
                key={card.role}
                id={`demo-${card.role}`}
                whileTap={{ scale: 0.98 }}
                onClick={() => loginAs(card.role)}
                disabled={loading}
                className="card p-4 text-left w-full disabled:opacity-50 transition-all hover:shadow-md cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br ${card.gradient}`}>
                    {card.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                      {card.title}
                    </p>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--chai-brown)' }}>
                      {card.subtitle}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {card.description}
                    </p>
                  </div>
                  {activeRole === card.role && loading && (
                    <div className="spinner flex-shrink-0 mt-1" style={{ width: 20, height: 20 }} />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
          >
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
}
