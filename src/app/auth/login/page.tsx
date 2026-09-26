'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { isValidPakistaniPhone, isValidPIN } from '@/lib/utils';
import { loginUser, getUserDoc } from '@/lib/auth';
import { usePWA } from '@/contexts/PWAContext';
import { ArrowLeft, Eye, EyeOff, Smartphone } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { openMobileAppModal } = usePWA();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');

    if (!isValidPakistaniPhone(phone)) {
      setError('Enter a valid Pakistani number (03XXXXXXXXX)');
      return;
    }
    if (!isValidPIN(pin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }

    setLoading(true);
    try {
      const user = await loginUser(phone.trim(), pin.trim());
      let userDoc = await getUserDoc(user.uid);
      if (!userDoc) {
        await new Promise((r) => setTimeout(r, 400));
        userDoc = await getUserDoc(user.uid);
      }

      const role = userDoc?.role || 'CUSTOMER';
      switch (role) {
        case 'CUSTOMER': router.replace('/customer'); break;
        case 'WORKER': router.replace('/worker'); break;
        case 'OWNER': router.replace('/owner'); break;
        default: router.replace('/customer'); break;
      }
    } catch (err: any) {
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.message?.includes('invalid-credential')
      ) {
        setError('Incorrect phone number or PIN');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--milk-cream)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <Link href="/" className="btn-ghost p-2 rounded-full">
          <ArrowLeft size={22} />
        </Link>
        <button
          onClick={openMobileAppModal}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-800/20 bg-amber-800/5 hover:bg-amber-800/10 transition-colors"
          style={{ color: 'var(--chai-brown)' }}
        >
          <Smartphone size={14} />
          <span>Mobile App</span>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col px-6 pt-4 max-w-md mx-auto w-full"
      >
        {/* Heading */}
        <div className="mb-8">
          <div className="text-3xl mb-2">☕</div>
          <h1 className="text-headline" style={{ color: 'var(--warm-charcoal)' }}>
            Welcome back
          </h1>
          <p className="text-body mt-1" style={{ color: 'var(--text-secondary)' }}>
            Login with your phone & PIN
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5">
          <div>
            <label className="input-label">Phone Number</label>
            <input
              id="login-phone"
              type="tel"
              inputMode="tel"
              placeholder="03XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              maxLength={11}
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="input-label">6-Digit PIN</label>
            <div className="relative">
              <input
                id="login-pin"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="\d{6}"
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-200"
            >
              {error}
            </motion.p>
          )}

          <button
            id="login-submit"
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading ? <span className="spinner border-white/40 border-t-white" style={{ width: 20, height: 20 }} /> : 'Login'}
          </button>
        </div>

        <p className="text-caption text-center mt-8" style={{ color: 'var(--text-tertiary)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-semibold" style={{ color: 'var(--chai-brown)' }}>
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
