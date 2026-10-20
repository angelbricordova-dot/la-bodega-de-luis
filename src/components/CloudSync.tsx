import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cloud, CloudOff, Loader2, Lock, RefreshCw } from 'lucide-react'
import { db, lastLocalChange, onLocalChange } from '../db'
import { refreshLicense, setAccount, signOut, useAccount, useLicenseState } from '../lib/account'
import { supabase } from '../lib/cloud'
import { lastCloudBackup, uploadCloudBackup } from '../lib/backup'
import { periodStart } from '../lib/sales'
import { startSync, syncNow, useSync } from '../lib/sync'
import { cx, toast } from './ui'

const HEARTBEAT_MS = 10 * 60 * 1000
/** El respaldo en archivo es un seguro aparte de la sincronización: como mucho uno cada 6 horas */
const BACKUP_GAP = 6 * 60 * 60 * 1000

async function collectStats() {
  const day = periodStart('hoy')
  const month = periodStart('mes')
  const sales = (await db.sales.where('createdAt').aboveOrEqual(month).toArray()).filter((s) => s.status !== 'anulada')
  const today = sales.filter((s) => s.createdAt >= day)
  const last = await db.sales.orderBy('createdAt').last()
  return {
    productos: await db.products.count(),
    ventas_hoy: today.length,
    total_hoy: Math.round(today.reduce((a, s) => a + s.total, 0) * 100) / 100,
    ventas_mes: sales.length,
    total_mes: Math.round(sales.reduce((a, s) => a + s.total, 0) * 100) / 100,
    ultima_venta: last?.createdAt ? new Date(last.createdAt).toISOString() : null,
    version: '1.2',
  }
}

/** Mantiene la licencia al día, sincroniza con los otros teléfonos y respalda en la nube */
export function CloudSync() {
  const account = useAccount((s) => s.account)
  const storeId = account?.mode === 'store' ? account.storeId : null
  const firstLoad = useSync((s) => s.firstLoad)
  const notice = useSync((s) => s.notice)
  const busy = useRef(false)

  useEffect(() => {
    if (notice) {
      toast(notice, { tone: 'info' })
      useSync.setState({ notice: '' })
    }
  }, [notice])

  // Ventas, inventario y fiados compartidos entre teléfonos
  useEffect(() => {
    if (!storeId) return
    return startSync(storeId, onLocalChange)
  }, [storeId])

  // Licencia, cierre de sesión remoto y respaldo
  useEffect(() => {
    if (!storeId) return
    const backupIfNeeded = async () => {
      if (lastLocalChange() <= lastCloudBackup() || Date.now() - lastCloudBackup() < BACKUP_GAP) return
      try {
        await uploadCloudBackup(storeId)
      } catch (e) {
        console.warn('Respaldo falló', e)
      }
    }
    const tick = async () => {
      if (busy.current || !navigator.onLine) return
      busy.current = true
      try {
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          toast('Tu sesión se cerró. Vuelve a entrar.', { tone: 'error' })
          setTimeout(() => signOut(), 1500)
          return
        }
        const lic = await refreshLicense(await collectStats())
        if (!lic.store || lic.store.id !== storeId) {
          toast('Este usuario ya no está vinculado a la bodega.', { tone: 'error' })
          setTimeout(() => signOut(), 1500)
          return
        }
        const acc = useAccount.getState().account
        if (acc?.mode === 'store') {
          if (acc.sessionRev == null) setAccount({ ...acc, sessionRev: lic.sessionRev ?? 0 })
          else if ((lic.sessionRev ?? 0) !== acc.sessionRev) {
            await syncNow(storeId).catch(() => {})
            toast('El administrador cerró la sesión en este teléfono.', { tone: 'error' })
            setTimeout(() => signOut(), 1500)
            return
          }
        }
        await backupIfNeeded()
      } catch (e) {
        console.warn('Licencia no se pudo confirmar', e)
      } finally {
        busy.current = false
      }
    }
    tick()
    const timer = setInterval(tick, HEARTBEAT_MS)
    window.addEventListener('online', tick)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', tick)
    }
  }, [storeId])

  if (!firstLoad) return null
  return (
    <div className="fixed inset-0 z-[80] bg-canvas/95 backdrop-blur flex flex-col items-center justify-center text-center px-8">
      <Loader2 size={40} className="text-brand-500 animate-spin" />
      <p className="text-lg font-bold mt-4">Descargando los datos de tu bodega…</p>
      <p className="text-sm text-muted mt-1">Productos, ventas y fiados de los otros teléfonos. Solo pasa la primera vez.</p>
    </div>
  )
}

/** Estado de la sincronización, para el encabezado */
export function SyncBadge() {
  const account = useAccount((s) => s.account)
  const { status, pending } = useSync()
  if (account?.mode !== 'store') return null
  const storeId = account.storeId
  const label =
    status === 'offline'
      ? pending
        ? `Sin internet · ${pending} por subir`
        : 'Sin internet'
      : status === 'syncing'
        ? 'Sincronizando'
        : status === 'error'
          ? 'Error al sincronizar'
          : pending
            ? `${pending} por subir`
            : 'Sincronizado'
  const Icon = status === 'offline' ? CloudOff : status === 'syncing' ? RefreshCw : Cloud
  return (
    <button
      onClick={() => syncNow(storeId)}
      className={cx(
        'inline-flex items-center gap-1 text-[10px] font-semibold',
        status === 'error' ? 'text-red-500' : status === 'offline' ? 'text-amber-600' : 'text-muted',
      )}
      title="Sincronizar ahora"
    >
      <Icon size={11} className={status === 'syncing' ? 'animate-spin' : ''} />
      {label}
    </button>
  )
}

export function LicenseBanner() {
  const nav = useNavigate()
  const l = useLicenseState()
  const account = useAccount((s) => s.account)
  if (account?.mode === 'demo') {
    return (
      <div className="bg-ink text-white text-[13px] font-semibold px-4 py-2 text-center pt-safe">
        Modo demostración · datos de ejemplo
      </div>
    )
  }
  if (!l || l.mode === 'activa') return null
  const tone =
    l.mode === 'prueba'
      ? 'bg-brand-50 text-brand-800'
      : l.mode === 'aviso' || l.mode === 'gracia'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-red-600 text-white'
  return (
    <button onClick={() => nav('/ajustes/plan')} className={cx('w-full text-[13px] font-semibold px-4 py-2 flex items-center justify-center gap-2 pt-safe', tone)}>
      {!l.canSell && <Lock size={14} />}
      <span>{l.message}</span>
      <span className="underline shrink-0">{l.canSell ? 'Ver plan' : 'Reportar pago'}</span>
    </button>
  )
}
