'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !userDoc) return;

    // Route by role
    switch (userDoc.role) {
      case 'CUSTOMER':
        router.replace('/customer');
        break;
      case 'WORKER':
        router.replace('/worker');
        break;
      case 'OWNER':
        router.replace('/owner');
        break;
    }
  }, [user, userDoc, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--milk-cream)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (user && userDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--milk-cream)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--milk-cream)' }}>
      {/* Hero Section */}
      <div className="gradient-hero flex-1 flex flex-col items-center justify-center px-8 py-16 text-white min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg">
            ☕
          </div>

          <h1 className="text-display text-white mb-3">ChaiKhata</h1>
          <p className="text-white/80 text-base font-medium max-w-xs mx-auto leading-relaxed">
            Chai delivery & cash tracking for Multan businesses
          </p>
        </motion.div>
      </div>

      {/* Login / Demo Section */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="bg-white rounded-t-3xl px-6 py-8 flex flex-col gap-4 shadow-[0_-4px_32px_rgba(43,27,18,0.12)]"
        style={{ minHeight: '40vh' }}
      >
        <h2 className="text-title text-center mb-2" style={{ color: 'var(--warm-charcoal)' }}>
          Get started
        </h2>

        <Link href="/auth/login" className="btn-primary w-full text-center no-underline">
          Login
        </Link>

        <Link href="/auth/signup" className="btn-secondary w-full text-center no-underline">
          Create Account
        </Link>

        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-caption" style={{ color: 'var(--text-tertiary)' }}>
              or try the prototype
            </span>
          </div>
        </div>

        <Link
          href="/demo"
          className="w-full text-center py-3.5 px-6 rounded-full font-bold text-sm transition-all"
          style={{
            background: 'linear-gradient(135deg, #E3A857, #F59E0B)',
            color: 'var(--warm-charcoal)',
            boxShadow: '0 4px 12px rgba(227, 168, 87, 0.4)',
          }}
        >
          🧪 Demo Mode — Test the Full Flow
        </Link>

        <p className="text-caption text-center mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Multan, Pakistan · Built for chai vendors
        </p>
      </motion.div>
    </div>
  );
}
