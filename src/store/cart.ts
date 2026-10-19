import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { LineItem, Product } from '../db'
import { round2, unitShort } from '../lib/money'

export type DiscountType = 'usd' | 'pct'

interface CartState {
  items: LineItem[]
  discountType: DiscountType
  discountValue: number
  finalPrice: number | null
  notes: string
  customerId?: number
  fromQuoteId?: number
  addProduct: (p: Product, opts?: { qty?: number; factor?: number; unitLabel?: string; unitPrice?: number }) => void
  addFree: (name: string, price: number, qty?: number) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  setDiscount: (type: DiscountType, value: number) => void
  setFinalPrice: (v: number | null) => void
  setNotes: (v: string) => void
  setCustomer: (id?: number) => void
  load: (items: LineItem[], extra?: Partial<Pick<CartState, 'notes' | 'customerId' | 'fromQuoteId'>>) => void
  clear: () => void
}

const line = (it: Omit<LineItem, 'total'>): LineItem => ({ ...it, total: round2(it.qty * it.unitPrice) })

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      discountType: 'usd',
      discountValue: 0,
      finalPrice: null,
      notes: '',
      addProduct: (p, opts = {}) =>
        set((s) => {
          const factor = opts.factor ?? 1
          const unitLabel = opts.unitLabel ?? unitShort[p.unit]
          const unitPrice = opts.unitPrice ?? p.price
          const qty = opts.qty ?? 1
          const key = `${p.id}-${unitLabel}`
          const existing = s.items.find((i) => i.key === key)
          if (existing) {
            return { items: s.items.map((i) => (i.key === key ? line({ ...i, qty: round3(i.qty + qty) }) : i)) }
          }
          return {
            items: [
              ...s.items,
              line({ key, productId: p.id, name: p.name, qty, factor, unitLabel, unitPrice, unitCost: p.cost * factor }),
            ],
          }
        }),
      addFree: (name, price, qty = 1) =>
        set((s) => ({
          items: [
            ...s.items,
            line({ key: `libre-${Date.now()}`, name: name || 'Venta libre', qty, factor: 1, unitLabel: 'c/u', unitPrice: price, unitCost: 0 }),
          ],
        })),
      setQty: (key, qty) =>
        set((s) => ({
          items: qty <= 0 ? s.items.filter((i) => i.key !== key) : s.items.map((i) => (i.key === key ? line({ ...i, qty }) : i)),
        })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      setDiscount: (discountType, discountValue) => set({ discountType, discountValue, finalPrice: null }),
      setFinalPrice: (finalPrice) => set({ finalPrice, discountValue: 0 }),
      setNotes: (notes) => set({ notes }),
      setCustomer: (customerId) => set({ customerId }),
      load: (items, extra = {}) =>
        set({ items, discountType: 'usd', discountValue: 0, finalPrice: null, notes: '', customerId: undefined, fromQuoteId: undefined, ...extra }),
      clear: () =>
        set({ items: [], discountType: 'usd', discountValue: 0, finalPrice: null, notes: '', customerId: undefined, fromQuoteId: undefined }),
    }),
    { name: 'bodega-carrito', storage: createJSONStorage(() => localStorage) },
  ),
)

function round3(n: number) {
  return Math.round(n * 1000) / 1000
}

export function cartTotals(s: Pick<CartState, 'items' | 'discountType' | 'discountValue' | 'finalPrice'>) {
  const subtotal = round2(s.items.reduce((a, i) => a + i.total, 0))
  let discount = 0
  if (s.finalPrice != null) discount = subtotal - s.finalPrice
  else if (s.discountType === 'pct') discount = (subtotal * s.discountValue) / 100
  else discount = s.discountValue
  discount = round2(Math.min(Math.max(discount, -subtotal * 10), subtotal))
  const count = s.items.reduce((a, i) => a + (i.unitLabel === 'kg' || i.unitLabel === 'm' ? 1 : i.qty), 0)
  return { subtotal, discount, total: round2(subtotal - discount), count: Math.round(count * 100) / 100 }
}
