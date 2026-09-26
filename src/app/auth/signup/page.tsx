'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { isValidPakistaniPhone, isValidPIN } from '@/lib/utils';
import { signUpUser } from '@/lib/auth';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup() {
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError('Enter your full name');
      return;
    }
    if (!isValidPakistaniPhone(phone)) {
      setError('Enter a valid Pakistani number (03XXXXXXXXX)');
      return;
    }
    if (!isValidPIN(pin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      await signUpUser({
        name: name.trim(),
        phone: phone.trim(),
        pin: pin.trim(),
        role: 'CUSTOMER',
      });
      router.replace('/customer');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use')) {
        setError('This phone number is already registered. Please login.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--milk-cream)' }}>
      <div className="flex items-center gap-3 p-5">
        <Link href="/" className="btn-ghost p-2 rounded-full">
          <ArrowLeft size={22} />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col px-6 pt-2 pb-8"
      >
        <div className="mb-8">
          <div className="text-3xl mb-2">☕</div>
          <h1 className="text-headline" style={{ color: 'var(--warm-charcoal)' }}>
            Create account
          </h1>
          <p className="text-body mt-1" style={{ color: 'var(--text-secondary)' }}>
            For customers & shop owners
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className="input-label">Your Name</label>
            <input
              id="signup-name"
              type="text"
              placeholder="e.g. Ali Rehman"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="input-label">Phone Number</label>
            <input
              id="signup-phone"
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
                id="signup-pin"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field pr-12"
                autoComplete="new-password"
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

          <div>
            <label className="input-label">Confirm PIN</label>
            <input
              id="signup-confirm-pin"
              type="password"
              inputMode="numeric"
              placeholder="••••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input-field"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-xl"
            >
              {error}
            </motion.p>
          )}

          <button
            id="signup-submit"
            onClick={handleSignup}
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading
              ? <span className="spinner border-white/40 border-t-white" style={{ width: 20, height: 20 }} />
              : 'Create Account'}
          </button>
        </div>

        <p className="text-caption text-center mt-6" style={{ color: 'var(--text-tertiary)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold" style={{ color: 'var(--chai-brown)' }}>
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
