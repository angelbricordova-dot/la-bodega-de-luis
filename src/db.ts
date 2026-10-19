import Dexie, { type Table } from 'dexie'

export type SellUnit = 'unidad' | 'kg' | 'm'

export interface Presentation {
  name: string
  /** Cuántas unidades base descuenta del stock */
  qty: number
  /** Precio en USD de la presentación completa */
  price: number
}

export interface Product {
  id?: number
  name: string
  barcode: string
  description?: string
  categoryId?: number
  unit: SellUnit
  /** Precio de venta en USD por unidad base (unidad, kg o metro) */
  price: number
  /** Costo en USD por unidad base */
  cost: number
  stock: number
  minStock: number
  expiry?: string
  image?: string
  presentations: Presentation[]
  createdAt: number
  updatedAt: number
}

export interface Category {
  id?: number
  name: string
  emoji: string
}

export interface Customer {
  id?: number
  name: string
  phone?: string
  idNumber?: string
  address?: string
  notes?: string
  createdAt: number
}

export interface Seller {
  id?: number
  name: string
  pin?: string
  active: boolean
}

export interface LineItem {
  key: string
  productId?: number
  name: string
  /** Cantidad mostrada (2 cajas, 0.25 kg, 3 unidades) */
  qty: number
  /** Unidades base que se descuentan del stock por cada qty */
  factor: number
  unitLabel: string
  unitPrice: number
  unitCost: number
  total: number
}

export type PaymentMethod =
  | 'efectivo_usd'
  | 'efectivo_bs'
  | 'pago_movil'
  | 'punto'
  | 'zelle'
  | 'biopago'
  | 'transferencia'
  | 'fiado'

export interface Payment {
  method: PaymentMethod
  /** Monto en USD que cubre este pago */
  amount: number
  /** Referencia de Pago Móvil, punto o transferencia */
  ref?: string
}

export type SaleStatus = 'pagada' | 'fiada' | 'anulada'

export interface Sale {
  id?: number
  number: number
  createdAt: number
  items: LineItem[]
  subtotal: number
  discount: number
  total: number
  /** Tasa Bs/USD al momento de la venta */
  rate: number
  payments: Payment[]
  received: number
  change: number
  customerId?: number
  customerName?: string
  sellerName?: string
  notes?: string
  status: SaleStatus
  /** Lo que falta por cobrar si es fiado */
  balance: number
  cashSessionId?: number
}

export type QuoteStatus = 'pendiente' | 'convertida'

export interface Quote {
  id?: number
  number: number
  createdAt: number
  validUntil: number
  items: LineItem[]
  subtotal: number
  discount: number
  total: number
  rate: number
  customerId?: number
  customerName?: string
  notes?: string
  status: QuoteStatus
}

export interface DebtPayment {
  id?: number
  customerId: number
  amount: number
  method: PaymentMethod
  createdAt: number
  note?: string
}

export type StockMoveType = 'venta' | 'ajuste' | 'compra' | 'anulacion' | 'inicial'

export interface StockMove {
  id?: number
  productId: number
  type: StockMoveType
  qty: number
  stockAfter: number
  note?: string
  createdAt: number
}

export interface CashSession {
  id?: number
  openedAt: number
  closedAt?: number
  openingCash: number
  openingBs: number
  countedCash?: number
  expectedCash?: number
  countedBs?: number
  expectedBs?: number
  salesTotal?: number
  salesCount?: number
  sellerName?: string
  notes?: string
}

export interface Purchase {
  id?: number
  supplier: string
  items: { productId: number; name: string; qty: number; cost: number }[]
  total: number
  createdAt: number
}

export interface Expense {
  id?: number
  concept: string
  amount: number
  createdAt: number
}

export interface Settings {
  id: 'main'
  business: {
    name: string
    rif: string
    address: string
    phone: string
    footer: string
    logo?: string
  }
  rate: number
  rateUpdatedAt: number
  showBs: boolean
  enabledPayments: PaymentMethod[]
  pagoMovil: { bank: string; phone: string; idNumber: string }
  printing: {
    paperWidth: 58 | 80
    autoPrint: boolean
    printLogo: boolean
    labelMode: 'sticker' | 'ticket'
    labelLang: 'TSPL' | 'CPCL'
    labelWidth: number
    labelHeight: number
  }
  quoteValidityDays: number
  adminPin: string
  currentSeller?: string
  supportPhone: string
  nextSaleNumber: number
  nextQuoteNumber: number
}

class BodegaDB extends Dexie {
  products!: Table<Product, number>
  categories!: Table<Category, number>
  customers!: Table<Customer, number>
  sellers!: Table<Seller, number>
  sales!: Table<Sale, number>
  quotes!: Table<Quote, number>
  debtPayments!: Table<DebtPayment, number>
  stockMoves!: Table<StockMove, number>
  cashSessions!: Table<CashSession, number>
  purchases!: Table<Purchase, number>
  expenses!: Table<Expense, number>
  settings!: Table<Settings, string>

  constructor() {
    super('bodega')
    this.version(1).stores({
      products: '++id, name, barcode, categoryId',
      categories: '++id, name',
      customers: '++id, name',
      sellers: '++id, name',
      sales: '++id, number, createdAt, customerId, status',
      quotes: '++id, number, createdAt, status',
      debtPayments: '++id, customerId, createdAt',
      stockMoves: '++id, productId, createdAt',
      cashSessions: '++id, openedAt, closedAt',
      purchases: '++id, createdAt',
      expenses: '++id, createdAt',
      settings: 'id',
    })
  }
}

export const db = new BodegaDB()

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  business: {
    name: 'La Bodega de Luis',
    rif: 'J-00000000-0',
    address: 'Calle principal, local 1',
    phone: '0412-0000000',
    footer: '¡Gracias por su compra!',
  },
  rate: 36.5,
  rateUpdatedAt: 0,
  showBs: true,
  enabledPayments: ['efectivo_usd', 'efectivo_bs', 'pago_movil', 'punto', 'zelle', 'biopago'],
  pagoMovil: { bank: '0102 Banco de Venezuela', phone: '0412-0000000', idNumber: 'V-00000000' },
  printing: {
    paperWidth: 58,
    autoPrint: true,
    printLogo: true,
    labelMode: 'sticker',
    labelLang: 'TSPL',
    labelWidth: 50,
    labelHeight: 25,
  },
  quoteValidityDays: 7,
  adminPin: '',
  supportPhone: '',
  nextSaleNumber: 1,
  nextQuoteNumber: 1,
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('main')
  return s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS
}

export async function updateSettings(patch: Partial<Settings>) {
  const s = await getSettings()
  await db.settings.put({ ...s, ...patch, id: 'main' })
}
