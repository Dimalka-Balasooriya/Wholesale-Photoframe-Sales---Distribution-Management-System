import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { CartItem } from '../types/catalog';

type CartScope = 'customer' | 'sales';

interface CartContextValue {
  customerCart: CartItem[];
  salesCart: CartItem[];
  addItem: (scope: CartScope, item: CartItem) => void;
  updateQuantity: (scope: CartScope, variantId: number, quantity: number) => void;
  removeItem: (scope: CartScope, variantId: number) => void;
  clearCart: (scope: CartScope) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const storageKeys: Record<CartScope, string> = {
  customer: 'customerCart',
  sales: 'salesCart'
};

function readCart(scope: CartScope) {
  try {
    return JSON.parse(localStorage.getItem(storageKeys[scope]) ?? '[]') as CartItem[];
  } catch {
    return [];
  }
}

function writeCart(scope: CartScope, items: CartItem[]) {
  localStorage.setItem(storageKeys[scope], JSON.stringify(items));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [customerCart, setCustomerCart] = useState<CartItem[]>(() => readCart('customer'));
  const [salesCart, setSalesCart] = useState<CartItem[]>(() => readCart('sales'));

  const setScopedCart = useCallback((scope: CartScope, updater: (items: CartItem[]) => CartItem[]) => {
    const setter = scope === 'customer' ? setCustomerCart : setSalesCart;
    setter((current) => {
      const next = updater(current);
      writeCart(scope, next);
      return next;
    });
  }, []);

  const addItem = useCallback(
    (scope: CartScope, item: CartItem) => {
      setScopedCart(scope, (current) => {
        const existing = current.find((cartItem) => cartItem.variantId === item.variantId);
        if (!existing) return [...current, item];
        return current.map((cartItem) =>
          cartItem.variantId === item.variantId
            ? { ...cartItem, quantity: Math.min(cartItem.availableStock, cartItem.quantity + item.quantity) }
            : cartItem
        );
      });
    },
    [setScopedCart]
  );

  const updateQuantity = useCallback(
    (scope: CartScope, variantId: number, quantity: number) => {
      setScopedCart(scope, (current) =>
        current.map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: Math.max(1, Math.min(item.availableStock, quantity)) }
            : item
        )
      );
    },
    [setScopedCart]
  );

  const removeItem = useCallback(
    (scope: CartScope, variantId: number) => {
      setScopedCart(scope, (current) => current.filter((item) => item.variantId !== variantId));
    },
    [setScopedCart]
  );

  const clearCart = useCallback(
    (scope: CartScope) => setScopedCart(scope, () => []),
    [setScopedCart]
  );

  const value = useMemo(
    () => ({ customerCart, salesCart, addItem, updateQuantity, removeItem, clearCart }),
    [customerCart, salesCart, addItem, updateQuantity, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
