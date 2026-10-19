import { db, getSettings, type LineItem, type Payment, type PaymentMethod, type Quote, type Sale } from '../db'
import { round2 } from './money'
import { canSellNow } from './account'

function assertCanSell() {
  if (!canSellNow()) throw new Error('Tu plan no está al día. Reporta tu pago en Ajustes → Mi plan.')
}

async function moveStock(items: LineItem[], sign: 1 | -1, type: 'venta' | 'anulacion', note: string) {
  const now = Date.now()
  for (const it of items) {
    if (!it.productId) continue
    const p = await db.products.get(it.productId)
    if (!p) continue
    const delta = sign * it.qty * it.factor
    const stockAfter = Math.round((p.stock + delta) * 1000) / 1000
    await db.products.update(p.id!, { stock: stockAfter, updatedAt: now })
    await db.stockMoves.add({ productId: p.id!, type, qty: delta, stockAfter, note, createdAt: now })
  }
}

export interface NewSale {
  items: LineItem[]
  subtotal: number
  discount: number
  total: number
  payments: Payment[]
  received: number
  change: number
  customerId?: number
  notes?: string
  fromQuoteId?: number
}

export async function createSale(input: NewSale): Promise<Sale> {
  assertCanSell()
  return db.transaction('rw', db.tables, async () => {
    const s = await getSettings()
    const customer = input.customerId ? await db.customers.get(input.customerId) : undefined
    const open = (await db.cashSessions.toArray()).find((c) => !c.closedAt)
    const fiado = input.payments.filter((p) => p.method === 'fiado').reduce((a, p) => a + p.amount, 0)
    const sale: Sale = {
      number: s.nextSaleNumber,
      createdAt: Date.now(),
      items: input.items,
      subtotal: input.subtotal,
      discount: input.discount,
      total: input.total,
      rate: s.rate,
      payments: input.payments,
      received: input.received,
      change: input.change,
      customerId: input.customerId,
      customerName: customer?.name,
      sellerName: s.currentSeller,
      notes: input.notes || undefined,
      status: fiado > 0 ? 'fiada' : 'pagada',
      balance: round2(fiado),
      cashSessionId: open?.id,
    }
    sale.id = await db.sales.add(sale)
    await db.settings.update('main', { nextSaleNumber: s.nextSaleNumber + 1 })
    await moveStock(input.items, -1, 'venta', `Ticket #${sale.number}`)
    if (input.fromQuoteId) await db.quotes.update(input.fromQuoteId, { status: 'convertida' })
    return sale
  })
}

export async function voidSale(sale: Sale) {
  if (sale.status === 'anulada') return
  await db.transaction('rw', db.tables, async () => {
    await db.sales.update(sale.id!, { status: 'anulada', balance: 0 })
    await moveStock(sale.items, 1, 'anulacion', `Anulación ticket #${sale.number}`)
  })
}

export async function createQuote(input: Omit<Quote, 'id' | 'number' | 'createdAt' | 'validUntil' | 'rate' | 'status' | 'customerName'>) {
  assertCanSell()
  return db.transaction('rw', db.settings, db.quotes, db.customers, async () => {
    const s = await getSettings()
    const customer = input.customerId ? await db.customers.get(input.customerId) : undefined
    const now = Date.now()
    const q: Quote = {
      ...input,
      number: s.nextQuoteNumber,
      createdAt: now,
      validUntil: now + s.quoteValidityDays * 864e5,
      rate: s.rate,
      status: 'pendiente',
      customerName: customer?.name,
    }
    q.id = await db.quotes.add(q)
    await db.settings.update('main', { nextQuoteNumber: s.nextQuoteNumber + 1 })
    return q
  })
}

/** Abono a la cuenta de un cliente: se aplica a los fiados más viejos primero */
export async function registerDebtPayment(customerId: number, amount: number, method: PaymentMethod, note?: string) {
  await db.transaction('rw', db.sales, db.debtPayments, async () => {
    let left = round2(amount)
    const debts = (await db.sales.where('customerId').equals(customerId).toArray())
      .filter((s) => s.status === 'fiada' && s.balance > 0)
      .sort((a, b) => a.createdAt - b.createdAt)
    for (const d of debts) {
      if (left <= 0) break
      const pay = Math.min(left, d.balance)
      await db.sales.update(d.id!, { balance: round2(d.balance - pay) })
      left = round2(left - pay)
    }
    await db.debtPayments.add({ customerId, amount: round2(amount), method, createdAt: Date.now(), note })
  })
}

export function cashInSale(sale: Sale) {
  if (sale.status === 'anulada') return 0
  const cash = sale.payments.filter((p) => p.method === 'efectivo_usd').reduce((a, p) => a + p.amount, 0)
  return round2(cash - (sale.change > 0 ? sale.change : 0))
}

export function periodStart(period: 'hoy' | 'semana' | 'mes' | 'todo') {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (period === 'hoy') return d.getTime()
  if (period === 'semana') {
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return d.getTime()
  }
  if (period === 'mes') {
    d.setDate(1)
    return d.getTime()
  }
  return 0
}
