'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Download, CheckCircle2, Share, PlusSquare, MoreVertical, Sparkles } from 'lucide-react';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileAppModal({ isOpen, onClose }: MobileAppModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'android' | 'ios' | 'desktop'>('android');

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setActivePlatform('ios');
    } else if (/android/.test(ua)) {
      setActivePlatform('android');
    } else {
      setActivePlatform('desktop');
    }

    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    // Register service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  async function handleNativeInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
          >
            {/* Header with App Banner */}
            <div className="gradient-hero p-6 text-white text-center relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 text-3xl shadow-lg border border-white/20">
                ☕
              </div>
              <h2 className="text-xl font-bold">ChaiKhata Mobile App</h2>
              <p className="text-xs text-white/80 mt-1">
                Install directly on your phone — no App Store needed!
              </p>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              {isInstalled ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <CheckCircle2 size={32} className="text-emerald-600 mx-auto mb-2" />
                  <p className="font-bold text-sm text-emerald-800">ChaiKhata is Installed!</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    You can launch ChaiKhata directly from your phone home screen.
                  </p>
                </div>
              ) : deferredPrompt ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-2 text-amber-900 font-bold text-sm">
                    <Sparkles size={18} className="text-amber-600" />
                    <span>Instant 1-Click Install Available</span>
                  </div>
                  <button
                    onClick={handleNativeInstall}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                  >
                    <Download size={18} />
                    <span>Install ChaiKhata Now</span>
                  </button>
                </div>
              ) : null}

              {/* Benefits */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-100 flex items-center gap-2.5">
                  <span className="text-lg">⚡</span>
                  <div>
                    <p className="font-semibold text-gray-800">1-Tap Ordering</p>
                    <p className="text-[10px] text-gray-500">Fast home screen launch</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center gap-2.5">
                  <span className="text-lg">🛵</span>
                  <div>
                    <p className="font-semibold text-gray-800">Live Delivery</p>
                    <p className="text-[10px] text-gray-500">Track delivery boy</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-2.5">
                  <span className="text-lg">💰</span>
                  <div>
                    <p className="font-semibold text-gray-800">Cash Khata</p>
                    <p className="text-[10px] text-gray-500">Multan chai ledger</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center gap-2.5">
                  <span className="text-lg">📶</span>
                  <div>
                    <p className="font-semibold text-gray-800">Low Data</p>
                    <p className="text-[10px] text-gray-500">Works on 2G / 3G</p>
                  </div>
                </div>
              </div>

              {/* Instructions per Platform */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  How to Install on your Device:
                </p>

                {/* Platform Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-xl mb-3">
                  <button
                    onClick={() => setActivePlatform('android')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activePlatform === 'android'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    🤖 Android
                  </button>
                  <button
                    onClick={() => setActivePlatform('ios')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activePlatform === 'ios'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    🍏 iPhone (iOS)
                  </button>
                  <button
                    onClick={() => setActivePlatform('desktop')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activePlatform === 'desktop'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    💻 Laptop / PC
                  </button>
                </div>

                {/* Steps */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-xs text-gray-700 flex flex-col gap-2.5">
                  {activePlatform === 'android' && (
                    <>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                          1
                        </span>
                        <span>Open this website in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                          2
                        </span>
                        <span>Tap the <strong>three dots menu (⋮)</strong> in the top-right corner.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                          3
                        </span>
                        <span>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</span>
                      </div>
                    </>
                  )}

                  {activePlatform === 'ios' && (
                    <>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                          1
                        </span>
                        <span>Open this website in <strong>Safari browser</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                          2
                        </span>
                        <span>Tap the <strong>Share button</strong> (square with arrow ⎋) at the bottom.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                          3
                        </span>
                        <span>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.</span>
                      </div>
                    </>
                  )}

                  {activePlatform === 'desktop' && (
                    <>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                          1
                        </span>
                        <span>In Google Chrome or Microsoft Edge, look at the <strong>URL address bar</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                          2
                        </span>
                        <span>Click the <strong>Install ChaiKhata</strong> icon (⊕) on the right side.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                          3
                        </span>
                        <span>Click <strong>Install</strong> to add it to your desktop and taskbar.</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
