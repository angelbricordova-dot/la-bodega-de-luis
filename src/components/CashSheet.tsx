import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LockKeyhole, LockKeyholeOpen } from 'lucide-react'
import { db, type CashSession, type PaymentMethod } from '../db'
import { useOpenCash, useSettings } from '../lib/hooks'
import { PAYMENT_INFO, bs, parseNum, round2, usd } from '../lib/money'
import { Button, Field, Input, Sheet, TextArea, toast } from './ui'

export async function cashSummary(session: CashSession) {
  const sales = (await db.sales.where('createdAt').aboveOrEqual(session.openedAt).toArray()).filter(
    (s) => s.status !== 'anulada' && (!session.closedAt || s.createdAt <= session.closedAt),
  )
  const abonos = (await db.debtPayments.where('createdAt').aboveOrEqual(session.openedAt).toArray()).filter(
    (a) => !session.closedAt || a.createdAt <= session.closedAt,
  )
  const byMethod: Partial<Record<PaymentMethod, number>> = {}
  let cashUsd = 0
  let cashBs = 0
  for (const s of sales) {
    for (const p of s.payments) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount
      if (p.method === 'efectivo_usd') cashUsd += p.amount
      if (p.method === 'efectivo_bs') cashBs += p.amount * s.rate
    }
    if (s.change > 0) cashUsd -= s.change
  }
  for (const a of abonos) {
    byMethod[a.method] = (byMethod[a.method] ?? 0) + a.amount
    if (a.method === 'efectivo_usd') cashUsd += a.amount
  }
  return {
    count: sales.length,
    total: round2(sales.reduce((a, s) => a + s.total, 0)),
    abonos: round2(abonos.reduce((a, x) => a + x.amount, 0)),
    byMethod,
    expectedUsd: round2(session.openingCash + cashUsd),
    expectedBs: round2((session.openingBs ?? 0) + cashBs),
  }
}

export function CashSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cash = useOpenCash()
  const s = useSettings()
  const [usdIn, setUsdIn] = useState('')
  const [bsIn, setBsIn] = useState('')
  const [notes, setNotes] = useState('')
  const summary = useLiveQuery(async () => (cash ? cashSummary(cash) : null), [cash?.id, open])

  const openCash = async () => {
    await db.cashSessions.add({ openedAt: Date.now(), openingCash: parseNum(usdIn), openingBs: parseNum(bsIn), sellerName: s.currentSeller })
    toast('Caja abierta')
    setUsdIn('')
    setBsIn('')
    onClose()
  }

  const closeCash = async () => {
    if (!cash || !summary) return
    await db.cashSessions.update(cash.id!, {
      closedAt: Date.now(),
      countedCash: parseNum(usdIn),
      countedBs: parseNum(bsIn),
      expectedCash: summary.expectedUsd,
      expectedBs: summary.expectedBs,
      salesTotal: summary.total,
      salesCount: summary.count,
      notes: notes || undefined,
    })
    toast('Caja cerrada', { tone: 'info' })
    setUsdIn('')
    setBsIn('')
    setNotes('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={cash ? 'Cerrar caja' : 'Abrir caja'}>
      {!cash ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-50 text-brand-700">
            <LockKeyholeOpen size={22} />
            <p className="text-sm font-medium">Cuenta el efectivo con el que empiezas el día (fondo de caja).</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fondo en $">
              <Input inputMode="decimal" placeholder="0.00" value={usdIn} onChange={(e) => setUsdIn(e.target.value)} />
            </Field>
            <Field label="Fondo en Bs">
              <Input inputMode="decimal" placeholder="0,00" value={bsIn} onChange={(e) => setBsIn(e.target.value)} />
            </Field>
          </div>
          <Button size="lg" className="w-full" onClick={openCash}>
            Abrir caja
          </Button>
        </div>
      ) : (
        summary && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Abierta {new Date(cash.openedAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
              {cash.sellerName ? ` por ${cash.sellerName}` : ''}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Ventas" value={usd(summary.total)} sub={`${summary.count} tickets`} />
              <Stat label="Abonos de fiados" value={usd(summary.abonos)} />
            </div>
            <div className="rounded-2xl border border-line divide-y divide-line">
              {Object.entries(summary.byMethod).map(([m, v]) => (
                <div key={m} className="flex justify-between px-4 py-2.5 text-sm">
                  <span>{PAYMENT_INFO[m as PaymentMethod].label}</span>
                  <span className="font-semibold tabular">{usd(v!)}</span>
                </div>
              ))}
              {Object.keys(summary.byMethod).length === 0 && <p className="px-4 py-3 text-sm text-muted">Sin ventas en este turno.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Contado en $ (esperado ${usd(summary.expectedUsd)})`}>
                <Input inputMode="decimal" placeholder={summary.expectedUsd.toFixed(2)} value={usdIn} onChange={(e) => setUsdIn(e.target.value)} />
              </Field>
              <Field label={`Contado en Bs (esperado ${bs(summary.expectedBs)})`}>
                <Input inputMode="decimal" placeholder={summary.expectedBs.toFixed(2)} value={bsIn} onChange={(e) => setBsIn(e.target.value)} />
              </Field>
            </div>
            {usdIn && (
              <Diff label="Diferencia en $" value={parseNum(usdIn) - summary.expectedUsd} fmt={usd} />
            )}
            {bsIn && <Diff label="Diferencia en Bs" value={parseNum(bsIn) - summary.expectedBs} fmt={bs} />}
            <Field label="Notas del cierre">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: se pagó al proveedor de pan" />
            </Field>
            <Button size="lg" variant="dark" className="w-full" onClick={closeCash}>
              <LockKeyhole size={18} /> Cerrar caja
            </Button>
          </div>
        )
      )}
    </Sheet>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-canvas p-3.5">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="text-lg font-extrabold tabular">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

function Diff({ label, value, fmt }: { label: string; value: number; fmt: (n: number) => string }) {
  const ok = Math.abs(value) < 0.01
  return (
    <div className={`flex justify-between px-4 py-3 rounded-2xl text-sm font-semibold ${ok ? 'bg-brand-50 text-brand-700' : value > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
      <span>{label}</span>
      <span className="tabular">{ok ? 'Cuadra ✓' : `${value > 0 ? '+' : ''}${fmt(value)}`}</span>
    </div>
  )
}
