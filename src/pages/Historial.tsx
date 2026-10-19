import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Calendar, ClipboardList, Copy, FileText, MessageCircle, Package, Printer, Receipt, Search, Share2, ShoppingCart, Trash2, TrendingUp, User, Wallet, XCircle } from 'lucide-react'
import { db, type Customer, type PaymentMethod, type Quote, type Sale } from '../db'
import { Page, PageHeader } from '../components/Layout'
import { Badge, Button, Card, Chip, Empty, Field, Input, Segmented, Sheet, confirmDialog, cx, toast } from '../components/ui'
import { useSettings } from '../lib/hooks'
import { PAYMENT_INFO, bs, parseNum, round2, toBs, usd } from '../lib/money'
import { periodStart, registerDebtPayment, voidSale } from '../lib/sales'
import { printDoc, shareWhatsApp } from '../lib/ticket'
import { useCart } from '../store/cart'

type Tab = 'tickets' | 'fiados' | 'cotizaciones'
type Period = 'hoy' | 'semana' | 'mes' | 'todo'

const fmtDate = (t: number) => new Date(t).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const num = (n: number) => '#' + String(n).padStart(6, '0')

export default function Historial() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'tickets'
  return (
    <>
      <PageHeader title="Historial" icon={<Receipt size={20} />} />
      <Page>
        <Segmented
          value={tab}
          onChange={(t) => setParams(t === 'tickets' ? {} : { tab: t }, { replace: true })}
          options={[
            { value: 'tickets', label: <><Receipt size={15} /> Tickets</> },
            { value: 'fiados', label: <><BookOpen size={15} /> Fiados</> },
            { value: 'cotizaciones', label: <><FileText size={15} /> Cotizac.</> },
          ]}
        />
        <div className="mt-4">
          {tab === 'tickets' && <Tickets />}
          {tab === 'fiados' && <Fiados />}
          {tab === 'cotizaciones' && <Cotizaciones />}
        </div>
      </Page>
    </>
  )
}

function PeriodChips({ value, onChange, color }: { value: Period; onChange: (p: Period) => void; color?: string }) {
  return (
    <div className="flex gap-2">
      {(['hoy', 'semana', 'mes', 'todo'] as Period[]).map((p) => (
        <Chip key={p} active={value === p} onClick={() => onChange(p)} color={color} className="flex-1 capitalize">
          {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Todo'}
        </Chip>
      ))}
    </div>
  )
}

/* ---------------- Tickets ---------------- */

function Tickets() {
  const s = useSettings()
  const [period, setPeriod] = useState<Period>('hoy')
  const [day, setDay] = useState('')
  const [q, setQ] = useState('')
  const [method, setMethod] = useState<PaymentMethod | 'all'>('all')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [open, setOpen] = useState<Sale | null>(null)
  const sales = useLiveQuery(() => db.sales.orderBy('createdAt').reverse().toArray(), [])
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), [])

  const inPeriod = useMemo(() => {
    let from = periodStart(period)
    let to = Infinity
    if (day) {
      const d = new Date(day + 'T00:00:00')
      from = d.getTime()
      to = from + 864e5
    }
    return (sales ?? []).filter((x) => x.createdAt >= from && x.createdAt < to)
  }, [sales, period, day])

  const valid = inPeriod.filter((x) => x.status !== 'anulada')
  const total = round2(valid.reduce((a, x) => a + x.total, 0))
  const profit = round2(valid.reduce((a, x) => a + x.total - x.items.reduce((b, i) => b + i.unitCost * i.qty, 0), 0))
  const byMethod = new Map<PaymentMethod, number>()
  for (const x of valid) for (const p of x.payments) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount)
  const payTotal = [...byMethod.values()].reduce((a, b) => a + b, 0) || 1

  const term = q.trim().toLowerCase()
  const list = inPeriod.filter(
    (x) =>
      (method === 'all' || x.payments.some((p) => p.method === method)) &&
      (customerId === '' || x.customerId === customerId) &&
      (!term || String(x.number).includes(term.replace('#', '')) || x.items.some((i) => i.name.toLowerCase().includes(term))),
  )
  const counts = (m: PaymentMethod) => inPeriod.filter((x) => x.payments.some((p) => p.method === m)).length

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <p className="text-[11px] font-extrabold tracking-wider text-muted flex items-center gap-1.5">
          <TrendingUp size={14} /> CUADRE {day ? `DEL ${day}` : period === 'hoy' ? 'DEL DÍA' : period === 'semana' ? 'DE LA SEMANA' : period === 'mes' ? 'DEL MES' : 'TOTAL'}
        </p>
        <p className="text-xs text-muted mt-2">Venta total acumulada</p>
        <p className="text-3xl font-extrabold tabular">{usd(total)}</p>
        <p className="text-sm text-muted font-semibold tabular">{toBs(total, s.rate)}</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <MiniStat label="Transacciones" value={`${valid.length} tickets`} />
          <MiniStat label="Ticket promedio" value={usd(valid.length ? total / valid.length : 0)} />
          <MiniStat label="Ganancia" value={usd(profit)} green />
        </div>
        {byMethod.size > 0 && (
          <>
            <p className="text-xs text-muted mt-4 mb-1.5">Desglose por método de pago</p>
            <div className="h-2.5 rounded-full overflow-hidden flex bg-canvas">
              {[...byMethod].map(([m, v]) => (
                <span key={m} style={{ width: `${(v / payTotal) * 100}%`, background: PAYMENT_INFO[m].color }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {[...byMethod].map(([m, v]) => (
                <span key={m} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-canvas text-xs">
                  <span className="size-2 rounded-full" style={{ background: PAYMENT_INFO[m].color }} />
                  <span>
                    <span className="block font-semibold">{PAYMENT_INFO[m].label}</span>
                    <span className="text-muted">{Math.round((v / payTotal) * 100)}%</span>
                  </span>
                  <span className="font-bold tabular ml-1">{usd(v)}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      <PeriodChips value={period} onChange={(p) => { setPeriod(p); setDay('') }} />
      <div className="flex gap-2">
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')} className="flex-1 min-w-0 h-11 rounded-2xl bg-surface border border-line px-3 text-sm font-semibold">
          <option value="">👤 Filtrar por cliente</option>
          {customers?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="relative h-11 px-3 rounded-2xl bg-surface border border-line flex items-center gap-2 text-sm font-semibold">
          <Calendar size={16} className="text-muted" />
          <span>{day || 'Día'}</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="absolute inset-0 opacity-0" />
        </label>
      </div>
      <Input icon={<Search size={18} />} placeholder="Buscar por N° de ticket o producto" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <Chip active={method === 'all'} onClick={() => setMethod('all')}>
          Todos ({inPeriod.length})
        </Chip>
        {[...s.enabledPayments, 'fiado' as PaymentMethod].map((m) => (
          <Chip key={m} active={method === m} onClick={() => setMethod(m)} color={PAYMENT_INFO[m].color}>
            {PAYMENT_INFO[m].label} ({counts(m)})
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty icon={<Receipt size={26} />} title="Sin tickets" text="Las ventas que hagas aparecerán aquí." />
      ) : (
        <div className="space-y-2">
          {list.map((x) => (
            <Card key={x.id} className={cx('p-3.5 flex items-center gap-3', x.status === 'anulada' && 'opacity-55')} onClick={() => setOpen(x)}>
              <span className="size-10 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0">
                <Receipt size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold tabular">{num(x.number)}</p>
                  {x.status === 'anulada' && <Badge tone="red">Anulada</Badge>}
                  {x.status === 'fiada' && <Badge tone="purple">{x.balance > 0 ? 'Fiado' : 'Fiado pagado'}</Badge>}
                </div>
                <p className="text-xs text-muted truncate">
                  {fmtDate(x.createdAt)} · {x.customerName ?? x.items.map((i) => i.name).join(', ')}
                </p>
                <div className="flex gap-1 mt-1">
                  {x.payments.map((p, i) => (
                    <span key={i} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: PAYMENT_INFO[p.method].color }}>
                      {PAYMENT_INFO[p.method].label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className={cx('font-extrabold tabular', x.status === 'anulada' && 'line-through')}>{usd(x.total)}</p>
                <p className="text-[11px] text-muted tabular">{toBs(x.total, x.rate)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
      {open && <SaleSheet sale={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function MiniStat({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="rounded-xl bg-canvas px-2.5 py-2">
      <p className="text-[10px] text-muted font-semibold">{label}</p>
      <p className={cx('text-sm font-extrabold tabular truncate', green && 'text-brand-600')}>{value}</p>
    </div>
  )
}

function SaleSheet({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const s = useSettings()
  const nav = useNavigate()
  const live = useLiveQuery(() => db.sales.get(sale.id!), [sale.id]) ?? sale
  const customer = useLiveQuery(async () => (live.customerId ? db.customers.get(live.customerId) : undefined), [live.customerId])
  return (
    <Sheet open onClose={onClose} title={`Ticket ${num(live.number)}`}>
      <p className="text-sm text-muted -mt-1">
        {new Date(live.createdAt).toLocaleString('es-VE')} {live.sellerName && `· ${live.sellerName}`}
        {live.customerName && ` · ${live.customerName}`}
      </p>
      <div className="divide-y divide-line mt-3">
        {live.items.map((i) => (
          <div key={i.key} className="py-2 flex justify-between text-sm gap-2">
            <span>
              {+i.qty.toFixed(3)} {i.unitLabel !== 'c/u' ? i.unitLabel : ''} · {i.name}
            </span>
            <span className="font-semibold tabular">{usd(i.total)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-dashed border-line mt-1 pt-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="tabular">{usd(live.subtotal)}</span></div>
        {live.discount !== 0 && <div className="flex justify-between"><span className="text-muted">Descuento</span><span className="tabular">{usd(-live.discount)}</span></div>}
        <div className="flex justify-between text-lg font-extrabold"><span>Total</span><span className="tabular">{usd(live.total)}</span></div>
        <div className="flex justify-between text-muted"><span>Tasa {live.rate.toFixed(2)}</span><span className="tabular">{bs(live.total * live.rate)}</span></div>
        {live.payments.map((p, i) => (
          <div key={i} className="flex justify-between"><span>{PAYMENT_INFO[p.method].label}{p.ref ? ` · ref ${p.ref}` : ''}</span><span className="tabular">{usd(p.amount)}</span></div>
        ))}
        {live.change > 0 && <div className="flex justify-between"><span>Vuelto</span><span className="tabular">{usd(live.change)}</span></div>}
        {live.balance > 0 && <div className="flex justify-between font-bold text-fiado"><span>Pendiente</span><span className="tabular">{usd(live.balance)}</span></div>}
        {live.notes && <p className="text-muted pt-1">Nota: {live.notes}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2.5 mt-5">
        <Button variant="outline" onClick={() => printDoc({ kind: 'sale', data: live }, s)}>
          <Printer size={17} /> Imprimir
        </Button>
        <Button variant="outline" onClick={() => shareWhatsApp({ kind: 'sale', data: live }, s, customer?.phone)}>
          <MessageCircle size={17} className="text-[#25d366]" /> WhatsApp
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            useCart.getState().load(live.items.map((i) => ({ ...i, key: `${i.key}-${Date.now()}` })), { customerId: live.customerId })
            nav('/orden')
          }}
        >
          <Copy size={17} /> Repetir venta
        </Button>
        {live.status !== 'anulada' && (
          <Button
            variant="danger"
            onClick={async () => {
              if (!(await confirmDialog('¿Anular este ticket?', { text: 'Los productos vuelven al inventario.', ok: 'Anular', danger: true }))) return
              await voidSale(live)
              toast('Ticket anulado', { tone: 'info' })
            }}
          >
            <XCircle size={17} /> Anular
          </Button>
        )}
      </div>
    </Sheet>
  )
}

/* ---------------- Fiados ---------------- */

interface Debtor {
  customer: Customer
  sales: Sale[]
  owed: number
  paid: number
  balance: number
  last: number
}

function Fiados() {
  const s = useSettings()
  const [q, setQ] = useState('')
  const [abono, setAbono] = useState<Debtor | null>(null)
  const [detail, setDetail] = useState<Debtor | null>(null)
  const debtors = useLiveQuery(async () => {
    const customers = await db.customers.toArray()
    const fiadas = await db.sales.where('status').equals('fiada').toArray()
    const out: Debtor[] = []
    for (const c of customers) {
      const mine = fiadas.filter((x) => x.customerId === c.id)
      if (!mine.length) continue
      const owed = mine.reduce((a, x) => a + x.payments.filter((p) => p.method === 'fiado').reduce((b, p) => b + p.amount, 0), 0)
      const balance = mine.reduce((a, x) => a + x.balance, 0)
      out.push({ customer: c, sales: mine, owed: round2(owed), paid: round2(owed - balance), balance: round2(balance), last: Math.max(...mine.map((x) => x.createdAt)) })
    }
    return out.sort((a, b) => b.balance - a.balance)
  }, [])
  const active = (debtors ?? []).filter((d) => d.balance > 0)
  const total = active.reduce((a, d) => a + d.balance, 0)
  const tickets = active.reduce((a, d) => a + d.sales.filter((x) => x.balance > 0).length, 0)
  const list = (debtors ?? []).filter((d) => !q || d.customer.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-3">
      <div className="rounded-3xl p-5 text-white bg-gradient-to-br from-fuchsia-500 to-purple-700 shadow-[0_14px_30px_-14px_rgba(168,40,200,.8)]">
        <p className="text-[11px] font-extrabold tracking-wider text-white/80 flex items-center gap-1.5">
          <BookOpen size={14} /> CUADERNO DE DEUDORES
        </p>
        <p className="text-xs text-white/75 mt-2">Total por cobrar</p>
        <p className="text-3xl font-extrabold tabular">{usd(total)}</p>
        <p className="text-sm text-white/80 tabular">{toBs(total, s.rate)}</p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <p className="text-[10px] text-white/75">Clientes</p>
            <p className="font-bold">{active.length} activos</p>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <p className="text-[10px] text-white/75">Tickets</p>
            <p className="font-bold">{tickets} por cobrar</p>
          </div>
        </div>
      </div>
      <Input icon={<Search size={18} />} placeholder="Buscar por cliente" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length === 0 && <Empty icon={<BookOpen size={26} />} title="Nadie debe" text="Cuando cobres con 'Crédito fiado' el cliente aparecerá aquí." />}
      {list.map((d) => (
        <Card key={d.customer.id} className="p-4">
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-full bg-fuchsia-50 text-fiado font-extrabold grid place-items-center">{d.customer.name[0]?.toUpperCase()}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{d.customer.name}</p>
              <p className="text-xs text-muted">
                {new Date(d.last).toLocaleDateString('es-VE')} · {d.sales.filter((x) => x.balance > 0).length} tickets pendientes
              </p>
            </div>
            {d.balance <= 0 && <Badge tone="green">Al día</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div className="rounded-xl bg-canvas px-3 py-2">
              <p className="text-[11px] text-muted">Total fiado</p>
              <p className="font-bold tabular">{usd(d.owed)}</p>
            </div>
            <div className="rounded-xl bg-canvas px-3 py-2">
              <p className="text-[11px] text-muted">Abonado</p>
              <p className="font-bold tabular text-brand-600">{usd(d.paid)}</p>
            </div>
          </div>
          <div className="flex justify-between items-baseline mt-3">
            <span className="font-semibold">Saldo pendiente</span>
            <span className="text-right">
              <span className="block text-xl font-extrabold text-fiado tabular">{usd(d.balance)}</span>
              <span className="block text-xs text-muted tabular">{toBs(d.balance, s.rate)}</span>
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setDetail(d)}>
              <ClipboardList size={15} /> Detalle
            </Button>
            {d.customer.phone && d.balance > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const text = `Hola ${d.customer.name}, le saluda ${s.business.name}. Le recordamos su saldo pendiente de ${usd(d.balance)} (${toBs(d.balance, s.rate)}). ¡Gracias!`
                  window.open(`https://wa.me/${d.customer.phone!.replace(/\D/g, '').replace(/^0/, '58')}?text=${encodeURIComponent(text)}`, '_blank')
                }}
                aria-label="Recordar por WhatsApp"
              >
                <MessageCircle size={15} className="text-[#25d366]" />
              </Button>
            )}
            {d.balance > 0 && (
              <Button size="sm" className="flex-1 !bg-fiado" onClick={() => setAbono(d)}>
                <Wallet size={15} /> Registrar abono
              </Button>
            )}
          </div>
        </Card>
      ))}
      {abono && <AbonoSheet debtor={abono} onClose={() => setAbono(null)} />}
      {detail && <DebtorDetail debtor={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function AbonoSheet({ debtor, onClose }: { debtor: Debtor; onClose: () => void }) {
  const s = useSettings()
  const [value, setValue] = useState('')
  const [cur, setCur] = useState<'usd' | 'bs'>('usd')
  const [method, setMethod] = useState<PaymentMethod>('efectivo_usd')
  const amount = round2(cur === 'usd' ? parseNum(value) : parseNum(value) / s.rate)
  const save = async () => {
    await registerDebtPayment(debtor.customer.id!, Math.min(amount, debtor.balance), method)
    toast('Abono registrado', { sub: usd(amount) })
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={`Abono de ${debtor.customer.name}`}>
      <p className="text-sm text-muted -mt-1 mb-4">
        Debe <b className="text-fiado">{usd(debtor.balance)}</b> ({toBs(debtor.balance, s.rate)})
      </p>
      <div className="space-y-4">
        <div className="flex gap-2 items-end">
          <Field label="Monto del abono" className="flex-1">
            <Input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" />
          </Field>
          <div className="w-28">
            <Segmented value={cur} onChange={setCur} options={[{ value: 'usd', label: '$' }, { value: 'bs', label: 'Bs' }]} />
          </div>
        </div>
        <div className="flex gap-2">
          <Chip onClick={() => { setCur('usd'); setValue(String(debtor.balance)) }}>Todo ({usd(debtor.balance)})</Chip>
          <Chip onClick={() => { setCur('usd'); setValue(String(round2(debtor.balance / 2))) }}>La mitad</Chip>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-muted mb-1.5">Cómo pagó</p>
          <div className="flex flex-wrap gap-2">
            {s.enabledPayments.map((m) => (
              <Chip key={m} active={method === m} onClick={() => setMethod(m)} color={PAYMENT_INFO[m].color}>
                {PAYMENT_INFO[m].label}
              </Chip>
            ))}
          </div>
        </div>
        <Button size="lg" className="w-full !bg-fiado" disabled={amount <= 0} onClick={save}>
          Registrar abono de {usd(Math.min(amount, debtor.balance))}
        </Button>
      </div>
    </Sheet>
  )
}

function DebtorDetail({ debtor, onClose }: { debtor: Debtor; onClose: () => void }) {
  const payments = useLiveQuery(() => db.debtPayments.where('customerId').equals(debtor.customer.id!).toArray(), [debtor.customer.id])
  const rows = [
    ...debtor.sales.map((x) => ({ t: x.createdAt, label: `Fiado ticket ${num(x.number)}`, amount: x.payments.filter((p) => p.method === 'fiado').reduce((a, p) => a + p.amount, 0), sign: 1 })),
    ...(payments ?? []).map((p) => ({ t: p.createdAt, label: `Abono · ${PAYMENT_INFO[p.method].label}`, amount: p.amount, sign: -1 })),
  ].sort((a, b) => b.t - a.t)
  return (
    <Sheet open onClose={onClose} title={debtor.customer.name} tall>
      <div className="divide-y divide-line">
        {rows.map((r, i) => (
          <div key={i} className="py-3 flex justify-between">
            <div>
              <p className="font-semibold text-sm">{r.label}</p>
              <p className="text-xs text-muted">{fmtDate(r.t)}</p>
            </div>
            <p className={cx('font-bold tabular', r.sign > 0 ? 'text-fiado' : 'text-brand-600')}>
              {r.sign > 0 ? '+' : '−'}
              {usd(r.amount)}
            </p>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

/* ---------------- Cotizaciones ---------------- */

function Cotizaciones() {
  const s = useSettings()
  const nav = useNavigate()
  const [period, setPeriod] = useState<Period>('todo')
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'vencidas' | 'convertidas'>('todas')
  const [q, setQ] = useState('')
  const quotes = useLiveQuery(() => db.quotes.orderBy('createdAt').reverse().toArray(), [])
  const now = Date.now()
  const status = (x: Quote) => (x.status === 'convertida' ? 'convertidas' : x.validUntil < now ? 'vencidas' : 'pendientes')
  const inPeriod = (quotes ?? []).filter((x) => x.createdAt >= periodStart(period))
  const list = inPeriod.filter((x) => (filter === 'todas' || status(x) === filter) && (!q || (x.customerName ?? '').toLowerCase().includes(q.toLowerCase())))
  const total = inPeriod.reduce((a, x) => a + x.total, 0)

  const convert = (x: Quote) => {
    useCart.getState().load(
      x.items.map((i) => ({ ...i, key: `${i.key}-${Date.now()}` })),
      { customerId: x.customerId, notes: x.notes ?? '', fromQuoteId: x.id },
    )
    nav('/orden')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-3xl p-5 text-white bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_14px_30px_-14px_rgba(91,79,224,.8)]">
        <p className="text-[11px] font-extrabold tracking-wider text-white/80 flex items-center gap-1.5">
          <FileText size={14} /> COTIZACIONES
        </p>
        <p className="text-xs text-white/75 mt-2">Cotizado en total</p>
        <p className="text-3xl font-extrabold tabular">{usd(total)}</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            ['Pendientes', inPeriod.filter((x) => status(x) === 'pendientes').length],
            ['Convertidas', inPeriod.filter((x) => status(x) === 'convertidas').length],
            ['Total', inPeriod.length],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-white/15 px-3 py-2">
              <p className="text-[10px] text-white/75">{l}</p>
              <p className="font-bold">{v}</p>
            </div>
          ))}
        </div>
      </div>
      <PeriodChips value={period} onChange={setPeriod} color="#5b4fe0" />
      <Input icon={<User size={18} />} placeholder="Buscar por cliente" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {(['todas', 'pendientes', 'vencidas', 'convertidas'] as const).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)} color="#5b4fe0" className="capitalize">
            {f}
          </Chip>
        ))}
      </div>
      {list.length === 0 && <Empty icon={<FileText size={26} />} title="Sin cotizaciones" text="En Revisar orden elige la pestaña Cotización para crear una." />}
      {list.map((x) => {
        const st = status(x)
        return (
          <Card key={x.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">{x.customerName ?? 'Sin cliente'}</p>
                <p className="text-xs text-muted">
                  {new Date(x.createdAt).toLocaleDateString('es-VE')} · {num(x.number)}
                </p>
              </div>
              <Badge tone={st === 'convertidas' ? 'green' : st === 'vencidas' ? 'red' : 'indigo'}>{st === 'convertidas' ? 'Convertida' : st === 'vencidas' ? 'Vencida' : 'Pendiente'}</Badge>
            </div>
            <div className="flex justify-between text-sm mt-3 rounded-xl bg-canvas px-3 py-2">
              <span className="flex items-center gap-1 text-muted">
                <Package size={14} /> {x.items.length} producto(s)
              </span>
              <span className="flex items-center gap-1 text-muted">
                <Calendar size={14} /> Válida hasta {new Date(x.validUntil).toLocaleDateString('es-VE')}
              </span>
            </div>
            <div className="flex justify-between items-baseline mt-3">
              <span className="text-muted">Total cotizado</span>
              <span className="text-xl font-extrabold text-quote tabular">{usd(x.total)}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => printDoc({ kind: 'quote', data: x }, s)} aria-label="Imprimir">
                <Printer size={15} />
              </Button>
              <Button size="sm" variant="outline" onClick={async () => shareWhatsApp({ kind: 'quote', data: x }, s, x.customerId ? (await db.customers.get(x.customerId))?.phone : undefined)} aria-label="Compartir">
                <Share2 size={15} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (await confirmDialog('¿Eliminar cotización?', { ok: 'Eliminar', danger: true })) await db.quotes.delete(x.id!)
                }}
                aria-label="Eliminar"
              >
                <Trash2 size={15} />
              </Button>
              <Button size="sm" className="!bg-quote" disabled={x.status === 'convertida'} onClick={() => convert(x)}>
                <ShoppingCart size={15} /> Vender
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
