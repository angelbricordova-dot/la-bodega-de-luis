import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/cloud'
import { licenseState, type LicenseMode, type StoreInfo } from '../lib/license'

export interface AdminStore extends StoreInfo {
  activation_code: string | null
  referred_by: string | null
  notes: string | null
  stats: {
    productos?: number
    ventas_hoy?: number
    total_hoy?: number
    ventas_mes?: number
    total_mes?: number
    ultima_venta?: string | null
  }
  last_seen_at: string | null
  last_backup_at: string | null
}

export interface AdminPayment {
  id: string
  store_id: string
  amount_usd: number
  amount_bs: number | null
  method: string
  reference: string | null
  note: string | null
  months: number
  status: 'pendiente' | 'aprobado' | 'rechazado'
  created_at: string
  reviewed_at: string | null
  review_note: string | null
  stores?: { name: string } | null
}

/** Carga datos de Supabase con recarga manual */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const run = useCallback(fn, deps)
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setData(await run())
      setError('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [run])
  useEffect(() => {
    reload()
  }, [reload])
  return { data, error, loading, reload }
}

export type LeadStatus = 'nuevo' | 'visitado' | 'interesado' | 'demo' | 'prueba' | 'cliente' | 'perdido'

export interface Lead {
  id: string
  name: string
  contact: string | null
  phone: string | null
  zone: string | null
  status: LeadStatus
  next_at: string | null
  notes: string | null
  store_id: string | null
  created_at: string
  updated_at: string
}

export const LEAD_STATUS: { value: LeadStatus; label: string; tone: 'green' | 'amber' | 'red' | 'gray' | 'indigo' | 'purple' }[] = [
  { value: 'nuevo', label: 'Por visitar', tone: 'gray' },
  { value: 'visitado', label: 'Visitado', tone: 'indigo' },
  { value: 'interesado', label: 'Interesado', tone: 'purple' },
  { value: 'demo', label: 'Vio la demo', tone: 'amber' },
  { value: 'prueba', label: 'En prueba', tone: 'indigo' },
  { value: 'cliente', label: 'Cliente', tone: 'green' },
  { value: 'perdido', label: 'No por ahora', tone: 'red' },
]

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase.from('leads').select('*').order('next_at', { ascending: true, nullsFirst: false }).order('updated_at', { ascending: false })
  if (error) throw error
  return data as Lead[]
}

/** Fecha local de hoy en formato AAAA-MM-DD */
export function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isDue(l: Lead) {
  return !!l.next_at && l.next_at <= todayIso() && l.status !== 'cliente' && l.status !== 'perdido'
}

export async function fetchStores(): Promise<AdminStore[]> {
  const { data, error } = await supabase.from('stores').select('*').order('name')
  if (error) throw error
  return data as AdminStore[]
}

export async function fetchPayments(filter: { status?: string; storeId?: string } = {}): Promise<AdminPayment[]> {
  let q = supabase.from('payments').select('*, stores(name)').order('created_at', { ascending: false }).limit(200)
  if (filter.status) q = q.eq('status', filter.status)
  if (filter.storeId) q = q.eq('store_id', filter.storeId)
  const { data, error } = await q
  if (error) throw error
  return data as AdminPayment[]
}

export const MODE_LABEL: Record<LicenseMode, string> = {
  prueba: 'En prueba',
  activa: 'Al día',
  aviso: 'Por vencer',
  gracia: 'En gracia',
  vencida: 'Vencida',
  suspendida: 'Suspendida',
  conectar: 'Sin conexión',
  dispositivo: 'Otro teléfono',
}

export const MODE_TONE: Record<LicenseMode, 'green' | 'amber' | 'red' | 'gray' | 'indigo'> = {
  prueba: 'indigo',
  activa: 'green',
  aviso: 'amber',
  gracia: 'amber',
  vencida: 'red',
  suspendida: 'red',
  conectar: 'gray',
  dispositivo: 'amber',
}

export function storeMode(s: AdminStore) {
  if (s.status === 'cancelled') return { ...licenseState(s, Date.now()), mode: 'suspendida' as LicenseMode }
  return licenseState(s, Date.now())
}

export function daysSince(iso: string | null) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
}

export function lastSeenText(iso: string | null) {
  const d = daysSince(iso)
  if (d == null) return 'Nunca se ha conectado'
  if (d === 0) return 'Conectada hoy'
  if (d === 1) return 'Conectada ayer'
  return `Sin conexión hace ${d} días`
}

export function waLink(phone: string | null | undefined, text: string) {
  const num = (phone ?? '').replace(/\D/g, '').replace(/^0/, '58')
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

export function activationMessage(store: AdminStore, code: string) {
  return `¡Hola${store.owner_name ? ' ' + store.owner_name : ''}! Ya está lista tu cuenta de TuBodega para ${store.name}.\n\n1. Abre ${location.origin}/?codigo=${code} en Chrome.\n2. Toca "Activar bodega", crea tu usuario y tu clave.\n3. Tu código de activación es: *${code}*\n\nDespués toca ⋮ → "Instalar app" para tenerla en la pantalla.`
}

/** Descarga una tabla como CSV que Excel abre bien (separador ; y acentos) */
export function downloadCsv(name: string, header: string[], rows: unknown[][]) {
  const cell = (v: unknown) => {
    const t = v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v)
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const csv = '\ufeff' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
