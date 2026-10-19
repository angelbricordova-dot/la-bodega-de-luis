import type { PaymentMethod, SellUnit } from '../db'

const usdFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const bsFmt = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const usd = (n: number) => `${n < -0.004 ? '-' : ''}$${usdFmt.format(Math.abs(round2(n)))}`
export const bs = (n: number) => `${n < -0.004 ? '-' : ''}Bs ${bsFmt.format(Math.abs(round2(n)))}`
export const toBs = (n: number, rate: number) => bs(n * rate)

export function qtyFmt(qty: number, unit: SellUnit) {
  if (unit === 'kg') return qty < 1 ? `${Math.round(qty * 1000)} g` : `${+qty.toFixed(3)} kg`
  if (unit === 'm') return `${+qty.toFixed(2)} m`
  return `${+qty.toFixed(2)}`
}

export function stockFmt(qty: number, unit: SellUnit) {
  if (unit === 'kg') return `${qty.toFixed(3)} kg`
  if (unit === 'm') return `${qty.toFixed(2)} m`
  return `${+qty.toFixed(2)} uds`
}

export const unitShort: Record<SellUnit, string> = { unidad: 'c/u', kg: 'kg', m: 'm' }

export const PAYMENT_INFO: Record<PaymentMethod, { label: string; hint: string; color: string; bs: boolean }> = {
  efectivo_usd: { label: 'Efectivo $', hint: 'Dólares en caja', color: '#2f9e6e', bs: false },
  efectivo_bs: { label: 'Efectivo Bs', hint: 'Bolívares en caja', color: '#0ea5a4', bs: true },
  pago_movil: { label: 'Pago Móvil', hint: 'Transferencia al teléfono', color: '#7c3aed', bs: true },
  punto: { label: 'Punto de venta', hint: 'Tarjeta de débito', color: '#2563eb', bs: true },
  zelle: { label: 'Zelle', hint: 'Transferencia en $', color: '#6d28d9', bs: false },
  biopago: { label: 'Biopago', hint: 'Huella BDV', color: '#dc2626', bs: true },
  transferencia: { label: 'Transferencia', hint: 'Bancaria en Bs', color: '#0891b2', bs: true },
  fiado: { label: 'Fiado', hint: 'Cuenta del cliente', color: '#c026d3', bs: false },
}

export function parseNum(s: string): number {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
