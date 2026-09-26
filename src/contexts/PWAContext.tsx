'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MobileAppModal } from '@/components/MobileAppModal';

interface PWAContextType {
  openMobileAppModal: () => void;
  closeMobileAppModal: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
}

const PWAContext = createContext<PWAContextType>({
  openMobileAppModal: () => {},
  closeMobileAppModal: () => {},
  isInstallable: false,
  isInstalled: false,
});

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if installed
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);

      // Register SW
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }

      const handleBeforeInstall = (e: Event) => {
        setIsInstallable(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', () => {
        setIsInstalled(true);
        setIsInstallable(false);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  return (
    <PWAContext.Provider
      value={{
        openMobileAppModal: () => setModalOpen(true),
        closeMobileAppModal: () => setModalOpen(false),
        isInstallable,
        isInstalled,
      }}
    >
      {children}
      <MobileAppModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </PWAContext.Provider>
  );
}

export function usePWA() {
  return useContext(PWAContext);
}
