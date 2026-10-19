import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2 } from 'lucide-react'
import { db } from '../../db'
import { Button, Card, Chip, Field, Input, Segmented, Sheet, cx, toast } from '../../components/ui'
import { useSettings } from '../../lib/hooks'
import { parseNum, round2, toBs, usd } from '../../lib/money'
import { periodStart } from '../../lib/sales'

type Period = 'hoy' | 'semana' | 'mes' | 'todo'

export default function Finanzas() {
  const s = useSettings()
  const [period, setPeriod] = useState<Period>('mes')
  const [addExp, setAddExp] = useState(false)
  const from = periodStart(period)
  const data = useLiveQuery(async () => {
    const sales = (await db.sales.where('createdAt').aboveOrEqual(from).toArray()).filter((x) => x.status !== 'anulada')
    const expenses = await db.expenses.where('createdAt').aboveOrEqual(from).reverse().sortBy('createdAt')
    const purchases = await db.purchases.where('createdAt').aboveOrEqual(from).toArray()
    return { sales, expenses, purchases }
  }, [from])

  const r = useMemo(() => {
    if (!data) return null
    const revenue = round2(data.sales.reduce((a, x) => a + x.total, 0))
    const cogs = round2(data.sales.reduce((a, x) => a + x.items.reduce((b, i) => b + i.unitCost * i.qty, 0), 0))
    const gross = round2(revenue - cogs)
    const exp = round2(data.expenses.reduce((a, x) => a + x.amount, 0))
    const purchases = round2(data.purchases.reduce((a, x) => a + x.total, 0))
    const prod = new Map<string, { qty: number; total: number }>()
    for (const x of data.sales) for (const i of x.items) {
      const e = prod.get(i.name) ?? { qty: 0, total: 0 }
      e.qty += i.qty * (i.unitLabel === 'kg' || i.unitLabel === 'm' ? 1 : i.factor)
      e.total += i.total
      prod.set(i.name, e)
    }
    const top = [...prod].sort((a, b) => b[1].total - a[1].total).slice(0, 6)
    const days: { label: string; total: number }[] = []
    for (let d = 13; d >= 0; d--) {
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - d)
      const end = start.getTime() + 864e5
      days.push({ label: start.toLocaleDateString('es-VE', { day: '2-digit' }), total: data.sales.filter((x) => x.createdAt >= start.getTime() && x.createdAt < end).reduce((a, x) => a + x.total, 0) })
    }
    return { revenue, cogs, gross, exp, net: round2(gross - exp), purchases, top, days, margin: revenue ? (gross / revenue) * 100 : 0 }
  }, [data])

  if (!r || !data) return null
  const max = Math.max(...r.days.map((d) => d.total), 1)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['hoy', 'semana', 'mes', 'todo'] as Period[]).map((p) => (
          <Chip key={p} active={period === p} onClick={() => setPeriod(p)} className="flex-1 capitalize">{p}</Chip>
        ))}
      </div>
      <Card className="p-4">
        <p className="text-xs text-muted">Ganancia neta</p>
        <p className={cx('text-3xl font-extrabold tabular', r.net < 0 ? 'text-red-500' : 'text-brand-600')}>{usd(r.net)}</p>
        <p className="text-sm text-muted tabular">{toBs(r.net, s.rate)}</p>
        <div className="mt-4 space-y-2 text-sm">
          <Line label="Ventas" value={usd(r.revenue)} />
          <Line label="Costo de lo vendido" value={`− ${usd(r.cogs)}`} />
          <Line label={`Ganancia bruta (${r.margin.toFixed(0)}%)`} value={usd(r.gross)} bold />
          <Line label="Gastos" value={`− ${usd(r.exp)}`} />
          <Line label="Compras a proveedores (salida de dinero)" value={usd(r.purchases)} muted />
        </div>
      </Card>
      <Card className="p-4">
        <p className="font-bold mb-3">Ventas de los últimos 14 días</p>
        <div className="flex items-end gap-1 h-32">
          {r.days.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="w-full rounded-t-md bg-brand-400 min-h-0.5" style={{ height: `${(d.total / max) * 100}%` }} title={usd(d.total)} />
              <span className="text-[9px] text-muted">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <p className="font-bold mb-2">Lo más vendido</p>
        {r.top.length === 0 && <p className="text-sm text-muted">Aún no hay ventas en este periodo.</p>}
        {r.top.map(([name, v], i) => (
          <div key={name} className="flex items-center gap-3 py-2">
            <span className="size-6 rounded-full bg-brand-50 text-brand-700 text-xs font-bold grid place-items-center">{i + 1}</span>
            <span className="flex-1 text-sm truncate">{name}</span>
            <span className="text-xs text-muted tabular">{+v.qty.toFixed(2)}</span>
            <span className="text-sm font-bold tabular w-20 text-right">{usd(v.total)}</span>
          </div>
        ))}
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold">Gastos</p>
          <Button size="sm" variant="soft" onClick={() => setAddExp(true)}><Plus size={15} /> Agregar</Button>
        </div>
        {data.expenses.length === 0 && <p className="text-sm text-muted">Luz, alquiler, transporte, bolsas…</p>}
        {data.expenses.map((e) => (
          <div key={e.id} className="flex items-center gap-2 py-2 border-t border-line first:border-0">
            <span className="flex-1 text-sm">{e.concept}<span className="block text-xs text-muted">{new Date(e.createdAt).toLocaleDateString('es-VE')}</span></span>
            <span className="font-bold tabular text-sm">{usd(e.amount)}</span>
            <button className="p-1 text-muted" onClick={() => db.expenses.delete(e.id!)} aria-label="Eliminar"><Trash2 size={15} /></button>
          </div>
        ))}
      </Card>
      {addExp && <ExpenseSheet onClose={() => setAddExp(false)} />}
    </div>
  )
}

function Line({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={cx('flex justify-between', bold && 'font-bold border-t border-line pt-2', muted && 'text-muted text-xs')}>
      <span className={bold ? '' : 'text-muted'}>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  )
}

function ExpenseSheet({ onClose }: { onClose: () => void }) {
  const s = useSettings()
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [cur, setCur] = useState<'usd' | 'bs'>('usd')
  const value = cur === 'usd' ? parseNum(amount) : parseNum(amount) / s.rate
  return (
    <Sheet open onClose={onClose} title="Nuevo gasto">
      <div className="space-y-4">
        <Field label="Concepto"><Input autoFocus value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej: Bolsas, luz, flete" /></Field>
        <div className="flex gap-2 flex-wrap">
          {['Bolsas', 'Luz', 'Alquiler', 'Transporte', 'Hielo', 'Gas'].map((c) => <Chip key={c} active={concept === c} onClick={() => setConcept(c)}>{c}</Chip>)}
        </div>
        <div className="flex gap-2 items-end">
          <Field label="Monto" className="flex-1"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <div className="w-28"><Segmented value={cur} onChange={setCur} options={[{ value: 'usd', label: '$' }, { value: 'bs', label: 'Bs' }]} /></div>
        </div>
        <Button size="lg" className="w-full" disabled={!concept || value <= 0} onClick={async () => {
          await db.expenses.add({ concept, amount: round2(value), createdAt: Date.now() })
          toast('Gasto registrado')
          onClose()
        }}>Guardar gasto {value > 0 && `· ${usd(value)}`}</Button>
      </div>
    </Sheet>
  )
}
