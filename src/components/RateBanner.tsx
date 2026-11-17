import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { updateSettings } from '../db'
import { useSettings } from '../lib/hooks'
import { fetchBcvRate } from '../lib/rate'
import { toast } from './ui'

/** Si la tasa no se ha actualizado hoy, pide actualizarla con un toque (consulta el BCV) */
export function RateBanner() {
  const s = useSettings()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (s.rateUpdatedAt >= today.getTime()) return null

  const update = async () => {
    setBusy(true)
    const r = await fetchBcvRate()
    setBusy(false)
    if (!r) {
      toast('No se pudo consultar el BCV. Escríbela a mano.', { tone: 'error' })
      return nav('/ajustes/pagos')
    }
    const rate = Math.round(r * 100) / 100
    await updateSettings({ rate, rateUpdatedAt: Date.now() })
    toast(`Tasa BCV de hoy: ${rate.toFixed(2)} Bs/$`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-2">
      <div className="rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 px-3.5 py-2.5 flex items-center gap-3">
        <p className="flex-1 text-[13px] font-bold leading-snug">
          Actualiza la tasa de hoy
          <span className="block text-[11px] font-semibold text-amber-700/80">Ahora: {s.rate.toFixed(2)} Bs/$</span>
        </p>
        <button onClick={update} disabled={busy} className="h-9 px-3 rounded-xl bg-amber-500 text-white text-[13px] font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-60">
          <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Tasa BCV
        </button>
      </div>
    </div>
  )
}
