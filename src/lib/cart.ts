import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartLine, GarmentSize } from "./types";

interface CartState {
  lines: CartLine[];
  add: (line: CartLine) => void;
  setQuantity: (productId: string, size: GarmentSize, quantity: number) => void;
  remove: (productId: string, size: GarmentSize) => void;
  clear: () => void;
  subtotalCents: () => number;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (line) =>
        set((state) => {
          const idx = state.lines.findIndex(
            (l) => l.product_id === line.product_id && l.size === line.size
          );
          if (idx >= 0) {
            const next = [...state.lines];
            next[idx] = { ...next[idx], quantity: next[idx].quantity + line.quantity };
            return { lines: next };
          }
          return { lines: [...state.lines, line] };
        }),
      setQuantity: (productId, size, quantity) =>
        set((state) => ({
          lines: state.lines
            .map((l) =>
              l.product_id === productId && l.size === size
                ? { ...l, quantity: Math.max(0, Math.floor(quantity)) }
                : l
            )
            .filter((l) => l.quantity > 0)
        })),
      remove: (productId, size) =>
        set((state) => ({
          lines: state.lines.filter((l) => !(l.product_id === productId && l.size === size))
        })),
      clear: () => set({ lines: [] }),
      subtotalCents: () => get().lines.reduce((sum, l) => sum + l.unit_price_cents * l.quantity, 0),
      count: () => get().lines.reduce((n, l) => n + l.quantity, 0)
    }),
    {
      name: "ldc-cart-v1",
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.localStorage))
    }
  )
);

const noopStorage: Storage = {
  length: 0,
  clear() {},
  getItem() { return null; },
  key() { return null; },
  removeItem() {},
  setItem() {}
};
