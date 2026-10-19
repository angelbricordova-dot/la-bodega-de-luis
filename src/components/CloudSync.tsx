import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloudDownload, Lock } from 'lucide-react'
import { db, lastLocalChange } from '../db'
import { refreshLicense, signOut, useAccount, useLicenseState } from '../lib/account'
import { supabase } from '../lib/cloud'
import { findCloudBackup, lastCloudBackup, restoreCloudBackup, uploadCloudBackup } from '../lib/backup'
import { periodStart } from '../lib/sales'
import { Button, Sheet, confirmDialog, cx, toast } from './ui'

const HEARTBEAT_MS = 10 * 60 * 1000
const BACKUP_MIN_GAP = 5 * 60 * 1000
export const FRESH_KEY = 'tubodega-fresh'
/** Mientras exista, no se sube respaldo: evita pisar el de la nube con un teléfono vacío */
const HOLD_KEY = 'tubodega-hold-backup'

const hold = (on: boolean) => {
  try {
    if (on) localStorage.setItem(HOLD_KEY, '1')
    else localStorage.removeItem(HOLD_KEY)
  } catch {
    /* nada */
  }
}
const isHeld = () => {
  try {
    return localStorage.getItem(HOLD_KEY) === '1'
  } catch {
    return false
  }
}

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
    version: '1.1',
  }
}

/** Mantiene la licencia al día y respalda los datos en la nube, sin estorbar */
export function CloudSync() {
  const account = useAccount((s) => s.account)
  const storeId = account?.mode === 'store' ? account.storeId : null
  const [restore, setRestore] = useState<{ updatedAt: string } | null>(null)
  const [restoring, setRestoring] = useState(false)
  const busy = useRef(false)

  useEffect(() => {
    if (!storeId) return
    let alive = true

    const backupIfNeeded = async (force = false) => {
      const changed = lastLocalChange() > lastCloudBackup()
      if (isHeld() || !changed || (!force && Date.now() - lastCloudBackup() < BACKUP_MIN_GAP)) return
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
        let fresh = false
        try {
          fresh = sessionStorage.getItem(FRESH_KEY) === '1'
          sessionStorage.removeItem(FRESH_KEY)
        } catch {
          /* nada */
        }
        if (fresh || isHeld()) {
          const found = await findCloudBackup(storeId)
          if (found && alive) {
            hold(true)
            setRestore(found)
            return
          }
          hold(false)
        }
        await backupIfNeeded()
      } catch (e) {
        console.warn('Sincronización falló', e)
      } finally {
        busy.current = false
      }
    }

    tick()
    const timer = setInterval(tick, HEARTBEAT_MS)
    const onOnline = () => tick()
    const onHide = () => document.visibilityState === 'hidden' && navigator.onLine && backupIfNeeded(true)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      alive = false
      clearInterval(timer)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [storeId])

  if (!restore || !storeId) return null
  return (
    <Sheet open onClose={() => {}} title="Encontramos tus datos">
      <div className="flex gap-3 p-4 rounded-2xl bg-brand-50 text-brand-800">
        <CloudDownload size={22} className="shrink-0" />
        <p className="text-sm">
          Hay un respaldo de tu bodega en la nube del {restore.updatedAt ? new Date(restore.updatedAt).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' }) : 'último uso'}. ¿Quieres
          traerlo a este teléfono?
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-5">
        <Button
          variant="outline"
          onClick={async () => {
            const ok = await confirmDialog('¿Empezar vacío?', {
              text: 'El respaldo de la nube se reemplazará con los datos de este teléfono la próxima vez que se respalde.',
              ok: 'Empezar vacío',
              danger: true,
            })
            if (!ok) return
            hold(false)
            setRestore(null)
          }}
        >
          Empezar vacío
        </Button>
        <Button
          disabled={restoring}
          onClick={async () => {
            setRestoring(true)
            try {
              await restoreCloudBackup(storeId)
              hold(false)
              toast('Datos restaurados')
              setRestore(null)
            } catch (e) {
              toast('No se pudo restaurar: ' + (e as Error).message, { tone: 'error' })
            } finally {
              setRestoring(false)
            }
          }}
        >
          {restoring ? 'Restaurando…' : 'Restaurar'}
        </Button>
      </div>
    </Sheet>
  )
}

/** Franja con el estado del plan cuando hace falta avisar algo */
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
