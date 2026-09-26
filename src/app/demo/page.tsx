'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { seedDemoData, DEMO_SHOP_ID } from '@/lib/seed';
import { loginUser, getUserDoc, DEMO_ACCOUNTS } from '@/lib/auth';
import { signOut } from '@/lib/auth';

type DemoRole = 'customer' | 'worker' | 'owner';

export default function DemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [seeded, setSeeded] = useState(false);
  const [activeRole, setActiveRole] = useState<DemoRole | null>(null);

  async function handleSeed() {
    setSeeding(true);
    setError('');
    try {
      await seedDemoData();
      setSeeded(true);
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
      await loginUser(account.phone, account.pin);
      const userDoc = await getUserDoc((await loginUser(account.phone, account.pin)).uid);

      switch (role) {
        case 'customer': router.push('/customer'); break;
        case 'worker': router.push('/worker'); break;
        case 'owner': router.push('/owner'); break;
      }
    } catch (err: any) {
      setError('Login failed — did you seed demo data first? ' + err.message);
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
      {/* Demo Banner */}
      <div className="demo-banner">
        🧪 DEMO MODE — Prototype Testing
      </div>

      <div className="flex-1 px-5 py-6 flex flex-col gap-5">
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

        {/* Step 1: Seed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="card p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: seeded ? 'var(--cardamom-green)' : 'var(--chai-brown)' }}>
              {seeded ? '✓' : '1'}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                Setup Demo Data
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Creates shop, menu, and 3 test accounts in Firestore
              </p>
            </div>
          </div>

          {seeded ? (
            <p className="text-sm font-semibold" style={{ color: 'var(--cardamom-green)' }}>
              ✓ Demo data ready! You can now login as any role.
            </p>
          ) : (
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
          )}
        </motion.div>

        {/* Step 2: Choose role */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'var(--chai-brown)' }}>
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
                disabled={loading || !seeded}
                className="card p-4 text-left w-full disabled:opacity-50 transition-all hover:shadow-md"
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

        {/* Flow guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="card-surface p-4"
        >
          <p className="text-caption font-bold mb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Test Flow
          </p>
          <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {[
              ['🧑‍💼', 'Customer', 'Place order → get delivery code'],
              ['👔', 'Owner', 'Accept order → assign worker (Hamza)'],
              ['🛵', 'Worker', 'Enter delivery code → delivery verified'],
              ['🧑‍💼', 'Customer', 'Confirm cash payment'],
              ['👔', 'Owner', 'See reconciliation → settle with Hamza'],
            ].map(([emoji, role, action], i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-base">{emoji}</span>
                <div className="flex-1">
                  <span className="font-semibold">{role}: </span>
                  <span className="opacity-75">{action}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {error && (
          <p className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-xl">
            {error}
          </p>
        )}

        <p className="text-center text-xs pb-4" style={{ color: 'var(--text-tertiary)' }}>
          All demo credentials: PIN = 123456
        </p>
      </div>
    </div>
  );
}
