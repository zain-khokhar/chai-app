'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CartItem, MenuItemDoc } from '@/lib/types';

interface CartContextValue {
  items: CartItem[];
  addItem: (item: MenuItemDoc) => void;
  removeItem: (itemId: string) => void;
  updateQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  totalAmount: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQty: () => {},
  clearCart: () => {},
  totalAmount: 0,
  itemCount: 0,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: MenuItemDoc) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.itemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.itemId === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          teaType: item.teaType,
          size: item.size,
          price: item.price,
          qty: 1,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
  }, []);

  const updateQty = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.itemId !== itemId));
    } else if (qty > 20) {
      // Max 20 per item
      return;
    } else {
      setItems((prev) =>
        prev.map((i) => (i.itemId === itemId ? { ...i, qty } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalAmount = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, totalAmount, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
