import Dexie, { type Table, type Transaction } from 'dexie'

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

  constructor(name: string) {
    super(name)
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
    // v2: _u = cuándo cambió en este teléfono (para saber qué falta subir a la nube)
    this.version(2).stores({
      products: '++id, name, barcode, categoryId, _u',
      categories: '++id, name, _u',
      customers: '++id, name, _u',
      sellers: '++id, name, _u',
      sales: '++id, number, createdAt, customerId, status, _u',
      quotes: '++id, number, createdAt, status, _u',
      debtPayments: '++id, customerId, createdAt, _u',
      stockMoves: '++id, productId, createdAt, _u',
      cashSessions: '++id, openedAt, closedAt, _u',
      purchases: '++id, createdAt, _u',
      expenses: '++id, createdAt, _u',
      settings: 'id, _u',
    })
  }
}

/** Tablas que se comparten entre los teléfonos de una bodega */
export const SYNC_TABLES = [
  'categories',
  'products',
  'customers',
  'sellers',
  'sales',
  'quotes',
  'debtPayments',
  'stockMoves',
  'cashSessions',
  'purchases',
  'expenses',
  'settings',
] as const
export type SyncTable = (typeof SYNC_TABLES)[number]

function lsGet(k: string) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* sin almacenamiento */
  }
}

/**
 * Ids únicos entre teléfonos: segundos desde 2025 × 1.000.000 + número del teléfono × 1000 + contador.
 * Así dos teléfonos de la misma bodega nunca crean el mismo id.
 */
const ID_EPOCH = Date.UTC(2025, 0, 1)
function deviceNum() {
  let n = Number(lsGet('tubodega-devnum'))
  if (!Number.isInteger(n) || n < 1 || n > 999) {
    n = 1 + Math.floor(Math.random() * 999)
    lsSet('tubodega-devnum', String(n))
  }
  return n
}
export function newId() {
  const base = Math.floor((Date.now() - ID_EPOCH) / 1000) * 1e6 + deviceNum() * 1000
  const last = Number(lsGet('tubodega-lastid') || 0)
  const id = base > last ? base : last + 1
  lsSet('tubodega-lastid', String(id))
  return id
}

/** Las escrituras que vienen de otro teléfono se marcan para no volver a subirlas */
export function markRemote(tx: Transaction | null) {
  if (tx) (tx as unknown as { __remote?: boolean }).__remote = true
}
const isRemote = (tx: Transaction) => !!(tx as unknown as { __remote?: boolean }).__remote

const changeListeners = new Set<() => void>()
export function onLocalChange(fn: () => void) {
  changeListeners.add(fn)
  return () => changeListeners.delete(fn)
}
const notifyChange = () => setTimeout(() => changeListeners.forEach((f) => f()), 0)

let trackDeletes = false
export function setTrackDeletes(on: boolean) {
  trackDeletes = on
}
export const tombstoneKey = () => `tubodega-del-${db.name}`
export function readTombstones(): { t: string; id: string }[] {
  try {
    return JSON.parse(lsGet(tombstoneKey()) || '[]')
  } catch {
    return []
  }
}
export function writeTombstones(list: { t: string; id: string }[]) {
  lsSet(tombstoneKey(), JSON.stringify(list))
}

/** Base de datos local de la bodega abierta. Cada cuenta tiene la suya en el teléfono. */
export let db = new BodegaDB('bodega')

const DIRTY_KEY = 'tubodega-dirty'

/** Abre la base de datos de una cuenta y marca cambios para el respaldo en la nube */
export function openDb(name: string) {
  if (db.name !== name) {
    db.close()
    db = new BodegaDB(name)
  }
  const mark = () => {
    try {
      localStorage.setItem(DIRTY_KEY, String(Date.now()))
    } catch {
      /* sin almacenamiento */
    }
  }
  for (const t of db.tables) {
    t.hook('creating', mark)
    t.hook('updating', mark)
    t.hook('deleting', mark)
  }
  for (const name of SYNC_TABLES) {
    const t = db.table(name)
    const autoId = name !== 'settings'
    t.hook('creating', function (pk, obj, tx) {
      const o = obj as { id?: number | string; _u?: number }
      if (!isRemote(tx)) {
        o._u = Date.now()
        notifyChange()
      }
      if (autoId && pk == null && o.id == null) {
        o.id = newId()
        return o.id
      }
      return undefined
    })
    t.hook('updating', function (_mods, _pk, _obj, tx) {
      if (isRemote(tx)) return undefined
      notifyChange()
      return { _u: Date.now() }
    })
    t.hook('deleting', function (pk, _obj, tx) {
      if (isRemote(tx) || !trackDeletes) return
      writeTombstones([...readTombstones(), { t: name, id: String(pk) }])
      notifyChange()
    })
  }
  return db
}

export function lastLocalChange() {
  try {
    return Number(localStorage.getItem(DIRTY_KEY) || 0)
  } catch {
    return 0
  }
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  business: {
    name: 'Mi Bodega',
    rif: '',
    address: '',
    phone: '',
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
