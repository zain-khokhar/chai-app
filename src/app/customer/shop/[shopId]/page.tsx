'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onMenuItemsSnapshot } from '@/lib/firestore';
import { getShop } from '@/lib/firestore';
import { MenuItemDoc, ShopDoc } from '@/lib/types';
import { useCart } from '@/contexts/CartContext';
import { formatPKR } from '@/lib/utils';
import { ArrowLeft, MapPin, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function ShopPage() {
  const params = useParams();
  const shopId = params.shopId as string;
  const router = useRouter();
  const [shop, setShop] = useState<ShopDoc | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { items: cartItems, addItem, updateQty, totalAmount, itemCount } = useCart();

  useEffect(() => {
    getShop(shopId).then((s) => {
      setShop(s);
      setLoading(false);
    });
    const unsub = onMenuItemsSnapshot(shopId, (items) => {
      setMenuItems(items.filter((i) => i.available));
    });
    return unsub;
  }, [shopId]);

  // Group by tea type
  const grouped = menuItems.reduce<Record<string, MenuItemDoc[]>>((acc, item) => {
    if (!acc[item.teaType]) acc[item.teaType] = [];
    acc[item.teaType].push(item);
    return acc;
  }, {});

  const getQty = (itemId: string) => cartItems.find((c) => c.itemId === itemId)?.qty ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--milk-cream)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: 'var(--milk-cream)' }}>
        <div className="text-center">
          <p className="text-2xl mb-3">🚫</p>
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Shop not found</p>
          <Link href="/customer" className="btn-ghost mt-4 inline-flex">Go back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--milk-cream)' }}>
      {/* Header */}
      <div className="gradient-hero px-5 pt-6 pb-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/customer" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 backdrop-blur">
            <ArrowLeft size={20} className="text-white" />
          </Link>
        </div>
        <div>
          <h1 className="text-headline text-white">{shop.shopName}</h1>
          <p className="flex items-center gap-1.5 text-white/75 text-sm mt-1.5">
            <MapPin size={13} />
            {shop.address}
          </p>
          <div className="flex items-center gap-2 mt-3">
            {shop.open ? (
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                🟢 Open
              </span>
            ) : (
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                🔴 Closed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-5 -mt-4" style={{ paddingBottom: itemCount > 0 ? 140 : 32 }}>
        <div className="card p-5 mb-4">
          <h2 className="text-title mb-4" style={{ color: 'var(--warm-charcoal)' }}>Tea Menu</h2>

          {Object.keys(grouped).length === 0 ? (
            <p className="text-body text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
              Menu not available
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(grouped).map(([teaType, items]) => (
                <div key={teaType}>
                  <h3 className="text-sm font-bold mb-3 pb-2 border-b" style={{
                    color: 'var(--chai-brown)',
                    borderColor: 'rgba(139,90,43,0.12)'
                  }}>
                    {teaType}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {items.map((item) => {
                      const qty = getQty(item.id);
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm" style={{ color: 'var(--warm-charcoal)' }}>
                              {item.size}
                            </p>
                            <p className="price-small">{formatPKR(item.price)}</p>
                          </div>

                          {/* Qty Stepper */}
                          {qty === 0 ? (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              id={`add-${item.id}`}
                              onClick={() => addItem(item)}
                              className="btn-primary text-sm py-2 px-5"
                              style={{ minHeight: 40, boxShadow: '0 3px 10px rgba(139,90,43,0.25)' }}
                            >
                              Add
                            </motion.button>
                          ) : (
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className="qty-stepper"
                            >
                              <button
                                className="qty-btn minus"
                                onClick={() => updateQty(item.id, qty - 1)}
                              >
                                −
                              </button>
                              <span className="qty-value">{qty}</span>
                              <button
                                className="qty-btn plus"
                                onClick={() => updateQty(item.id, qty + 1)}
                              >
                                +
                              </button>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Cart CTA */}
      {itemCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3"
          style={{ background: 'linear-gradient(to top, var(--milk-cream) 60%, transparent)' }}
        >
          <button
            id="view-cart"
            onClick={() => router.push(`/customer/cart?shopId=${shopId}`)}
            className="btn-primary w-full"
          >
            <ShoppingBag size={18} />
            <span className="flex-1">View Cart · {itemCount} item{itemCount > 1 ? 's' : ''}</span>
            <span>{formatPKR(totalAmount)}</span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
