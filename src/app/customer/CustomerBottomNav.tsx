'use client';

import { Home, ShoppingBag, User } from 'lucide-react';

interface Props {
  tab: 'home' | 'orders' | 'profile';
  setTab: (tab: 'home' | 'orders' | 'profile') => void;
}

export default function CustomerBottomNav({ tab, setTab }: Props) {
  const items = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'orders' as const, label: 'Orders', icon: ShoppingBag },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => setTab(id)}
            className={`bottom-nav-item ${tab === id ? 'active' : ''}`}
          >
            <Icon size={22} strokeWidth={tab === id ? 2.5 : 1.8} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
