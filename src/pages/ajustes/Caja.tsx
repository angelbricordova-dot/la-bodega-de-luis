import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LockKeyhole, LockKeyholeOpen } from 'lucide-react'
import { db } from '../../db'
import { Badge, Button, Card, cx } from '../../components/ui'
import { CashSheet } from '../../components/CashSheet'
import { useOpenCash } from '../../lib/hooks'
import { bs, usd } from '../../lib/money'

export default function Caja() {
  const [open, setOpen] = useState(false)
  const cash = useOpenCash()
  const sessions = useLiveQuery(() => db.cashSessions.orderBy('openedAt').reverse().toArray(), [])
  const fmt = (t: number) => new Date(t).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })
  return (
    <div className="space-y-3">
      <Button size="lg" variant={cash ? 'dark' : 'primary'} className="w-full" onClick={() => setOpen(true)}>
        {cash ? <><LockKeyhole size={18} /> Cerrar caja</> : <><LockKeyholeOpen size={18} /> Abrir caja</>}
      </Button>
      {sessions?.map((c) => {
        const diffUsd = c.closedAt && c.countedCash != null ? c.countedCash - (c.expectedCash ?? 0) : null
        return (
          <Card key={c.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">{fmt(c.openedAt)}</p>
                <p className="text-xs text-muted">{c.closedAt ? `Cerrada ${fmt(c.closedAt)}` : 'En curso'}{c.sellerName && ` · ${c.sellerName}`}</p>
              </div>
              <Badge tone={c.closedAt ? 'gray' : 'green'}>{c.closedAt ? 'Cerrada' : 'Abierta'}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div className="rounded-xl bg-canvas px-3 py-2"><p className="text-[11px] text-muted">Fondo inicial</p><p className="font-semibold tabular">{usd(c.openingCash)} · {bs(c.openingBs ?? 0)}</p></div>
              <div className="rounded-xl bg-canvas px-3 py-2"><p className="text-[11px] text-muted">Ventas</p><p className="font-semibold tabular">{c.salesTotal != null ? `${usd(c.salesTotal)} (${c.salesCount})` : '—'}</p></div>
            </div>
            {diffUsd != null && (
              <p className={cx('mt-2 text-sm font-semibold', Math.abs(diffUsd) < 0.01 ? 'text-brand-600' : diffUsd > 0 ? 'text-amber-600' : 'text-red-500')}>
                {Math.abs(diffUsd) < 0.01 ? 'Efectivo $ cuadró ✓' : `Diferencia en $: ${diffUsd > 0 ? '+' : ''}${usd(diffUsd)}`}
              </p>
            )}
            {c.notes && <p className="text-xs text-muted mt-1">{c.notes}</p>}
          </Card>
        )
      })}
      <CashSheet open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
