import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Banknote, Check, ChevronRight, CreditCard, FileText, Fingerprint, Landmark, MessageCircle, Plus, Printer, Receipt, Smartphone, Split, Trash2, User, Wallet, Zap } from 'lucide-react'
import { db, type Payment, type PaymentMethod, type Quote, type Sale } from '../db'
import { PageHeader } from '../components/Layout'
import { CustomerPicker } from '../components/CustomerPicker'
import { VentaLibreSheet } from '../components/AddProductSheet'
import { Button, Card, Field, Input, Segmented, TextArea, cx, toast } from '../components/ui'
import { cartTotals, useCart } from '../store/cart'
import { useSettings } from '../lib/hooks'
import { PAYMENT_INFO, bs, parseNum, round2, toBs, usd } from '../lib/money'
import { createQuote, createSale } from '../lib/sales'
import { printDoc, shareWhatsApp, buildEscPos } from '../lib/ticket'
import { printerStatus, sendToPrinter } from '../lib/bluetooth'

const ICONS: Record<PaymentMethod, typeof Banknote> = {
  efectivo_usd: Banknote,
  efectivo_bs: Wallet,
  pago_movil: Smartphone,
  punto: CreditCard,
  zelle: Landmark,
  biopago: Fingerprint,
  transferencia: Landmark,
  fiado: Receipt,
}

type Mode = PaymentMethod | 'mixto'
interface MixRow {
  method: PaymentMethod
  value: string
}

export default function RevisarOrden() {
  const nav = useNavigate()
  const s = useSettings()
  const cart = useCart()
  const totals = cartTotals(cart)
  const [tab, setTab] = useState<'venta' | 'cotizacion'>('venta')
  const [mode, setMode] = useState<Mode>('efectivo_usd')
  const [received, setReceived] = useState('')
  const [ref, setRef] = useState('')
  const [mix, setMix] = useState<MixRow[]>([])
  const [discount, setDiscount] = useState(cart.discountValue ? String(cart.discountValue) : '')
  const [finalPrice, setFinalPrice] = useState('')
  const [pickCustomer, setPickCustomer] = useState(false)
  const [libre, setLibre] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ kind: 'sale'; data: Sale } | { kind: 'quote'; data: Quote } | null>(null)
  const finished = useRef(false)
  const [customerPhone, setCustomerPhone] = useState<string>()
  const customer = useLiveQuery(async () => (cart.customerId ? await db.customers.get(cart.customerId) : undefined), [cart.customerId])

  useEffect(() => {
    if (!cart.items.length && !finished.current) nav('/', { replace: true })
  }, [cart.items.length, nav])

  const total = totals.total
  const rate = s.rate
  const info = mode !== 'mixto' ? PAYMENT_INFO[mode] : null

  // cálculo de pago
  let payments: Payment[] = []
  let receivedUsd = total
  let change = 0
  let valid = total >= 0
  if (mode === 'mixto') {
    payments = mix
      .map((r) => ({ method: r.method, amount: round2(PAYMENT_INFO[r.method].bs ? parseNum(r.value) / rate : parseNum(r.value)) }))
      .filter((p) => p.amount > 0)
    receivedUsd = round2(payments.reduce((a, p) => a + p.amount, 0))
    change = round2(Math.max(0, receivedUsd - total))
    valid = receivedUsd >= total - 0.005 && payments.length > 0 && (!payments.some((p) => p.method === 'fiado') || !!cart.customerId)
  } else if (mode === 'efectivo_usd' || mode === 'efectivo_bs') {
    const r = received ? (mode === 'efectivo_bs' ? parseNum(received) / rate : parseNum(received)) : total
    receivedUsd = round2(r)
    change = round2(Math.max(0, receivedUsd - total))
    payments = [{ method: mode, amount: total }]
    valid = receivedUsd >= total - 0.005
  } else {
    payments = [{ method: mode, amount: total, ref: ref || undefined }]
    valid = mode !== 'fiado' || !!cart.customerId
  }
  const remaining = round2(Math.max(0, total - receivedUsd))

  const applyDiscount = (v: string, type = cart.discountType) => {
    setDiscount(v)
    setFinalPrice('')
    cart.setDiscount(type, parseNum(v))
  }

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (tab === 'cotizacion') {
        const q = await createQuote({ items: cart.items, subtotal: totals.subtotal, discount: totals.discount, total, customerId: cart.customerId, notes: cart.notes || undefined })
        setDone({ kind: 'quote', data: q })
        toast('Cotización guardada')
      } else {
        const sale = await createSale({
          items: cart.items,
          subtotal: totals.subtotal,
          discount: totals.discount,
          total,
          payments,
          received: receivedUsd,
          change,
          customerId: cart.customerId,
          notes: cart.notes,
          fromQuoteId: cart.fromQuoteId,
        })
        setDone({ kind: 'sale', data: sale })
        if (s.printing.autoPrint && printerStatus('ticket').name) {
          buildEscPos({ kind: 'sale', data: sale }, s)
            .then((b) => sendToPrinter('ticket', b))
            .catch(() => {})
        }
      }
      finished.current = true
      setCustomerPhone(customer?.phone)
      cart.clear()
    } catch (e) {
      toast('No se pudo guardar: ' + (e as Error).message, { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  if (done) return <Done done={done} onNew={() => nav('/', { replace: true })} customerPhone={customerPhone} />

  const methods: Mode[] = [...s.enabledPayments, 'mixto']

  return (
    <>
      <PageHeader title="Revisar orden" back />
      <main className="max-w-lg mx-auto px-4 pb-36 space-y-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'venta', label: <><Receipt size={15} /> Venta</> },
            { value: 'cotizacion', label: <><FileText size={15} /> Cotización</> },
          ]}
        />

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold">{cart.items.length} artículos</p>
            <Button size="sm" variant="soft" onClick={() => setLibre(true)}>
              <Zap size={14} /> Venta libre
            </Button>
          </div>
          <div className="divide-y divide-line">
            {cart.items.map((it) => (
              <div key={it.key} className="flex items-center gap-2 py-2 text-sm">
                <span className="flex-1 min-w-0 truncate">{it.name}</span>
                <span className="text-muted tabular whitespace-nowrap">
                  {it.unitLabel === 'kg' ? (it.qty < 1 ? `${Math.round(it.qty * 1000)}g` : `${it.qty}kg`) : `x${+it.qty.toFixed(2)}`}
                </span>
                <span className="w-20 text-right font-semibold tabular">{usd(it.total)}</span>
                <button className="text-muted/60 hover:text-red-500 p-1" onClick={() => cart.remove(it.key)} aria-label="Quitar">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-line mt-2 pt-3 space-y-1.5">
            <Row label="Subtotal productos" value={usd(totals.subtotal)} />
            {totals.discount !== 0 && <Row label={totals.discount > 0 ? 'Descuento' : 'Recargo'} value={usd(-totals.discount)} className="text-brand-600" />}
            <div className="flex items-end justify-between pt-1">
              <span className="font-semibold text-muted">Total a cobrar</span>
              <span className="text-right">
                <span className="block text-3xl font-extrabold tabular">{usd(total)}</span>
                <span className="block text-sm font-semibold text-muted tabular">{toBs(total, rate)}</span>
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div>
            <p className="font-bold mb-2">Descuento</p>
            <div className="flex gap-2">
              <Input className="flex-1" inputMode="decimal" placeholder="0" value={discount} onChange={(e) => applyDiscount(e.target.value)} />
              <div className="w-32">
                <Segmented
                  value={cart.discountType}
                  onChange={(t) => applyDiscount(discount, t)}
                  options={[
                    { value: 'usd', label: '$' },
                    { value: 'pct', label: '%' },
                  ]}
                />
              </div>
            </div>
          </div>
          <div>
            <p className="font-bold">Precio final (opcional)</p>
            <p className="text-xs text-muted mb-2">Escribe a cuánto quieres que quede toda la cuenta, sea más o menos que el precio normal.</p>
            <div className="flex gap-2">
              <Input className="flex-1" inputMode="decimal" placeholder={total.toFixed(2)} value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} />
              <Button
                className="h-12"
                onClick={() => {
                  if (!finalPrice) return cart.setFinalPrice(null)
                  cart.setFinalPrice(parseNum(finalPrice))
                  setDiscount('')
                  toast('Precio final aplicado', { tone: 'info' })
                }}
              >
                Aplicar
              </Button>
            </div>
          </div>
          <Field label="Notas / Observaciones">
            <TextArea value={cart.notes} onChange={(e) => cart.setNotes(e.target.value)} placeholder="Ej: entregar en la puerta, sin cebolla…" />
          </Field>
          <button onClick={() => setPickCustomer(true)} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-line text-left">
            <span className="size-10 rounded-xl bg-canvas grid place-items-center text-muted">
              <User size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-xs text-muted">Cliente (opcional)</span>
              <span className="block font-semibold">{customer?.name ?? 'Sin asociar'}</span>
            </span>
            <ChevronRight size={18} className="text-muted" />
          </button>
        </Card>

        {tab === 'venta' && (
          <Card className="p-4">
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-bold">Método de pago</p>
              <span className="text-xs text-muted">Seleccione uno</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {methods
                .filter((m) => m !== 'fiado')
                .map((m) => {
                  const Icon = m === 'mixto' ? Split : ICONS[m]
                  const label = m === 'mixto' ? 'Pago mixto' : PAYMENT_INFO[m].label
                  const hint = m === 'mixto' ? 'Combinar métodos' : PAYMENT_INFO[m].hint
                  const active = mode === m
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m)
                        setReceived('')
                        if (m === 'mixto' && !mix.length) setMix([{ method: 'efectivo_usd', value: '' }, { method: 'pago_movil', value: '' }])
                      }}
                      className={cx(
                        'relative text-left p-3 rounded-2xl border transition active:scale-[.97]',
                        active ? 'bg-brand-500 border-brand-500 text-white shadow-[0_8px_18px_-8px_rgba(47,158,110,.8)]' : 'bg-surface border-line',
                      )}
                    >
                      <span className={cx('size-8 rounded-lg grid place-items-center mb-2', active ? 'bg-white/20' : 'bg-canvas')} style={active ? undefined : { color: m === 'mixto' ? '#d97706' : PAYMENT_INFO[m].color }}>
                        <Icon size={17} />
                      </span>
                      <span className="block font-bold text-sm">{label}</span>
                      <span className={cx('block text-[11px]', active ? 'text-white/80' : 'text-muted')}>{hint}</span>
                      {active && (
                        <span className="absolute top-2.5 right-2.5 size-5 rounded-full bg-white text-brand-600 grid place-items-center">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
            </div>
            <button
              onClick={() => (cart.customerId ? setMode('fiado') : setPickCustomer(true))}
              className={cx(
                'mt-2.5 w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition',
                mode === 'fiado' ? 'bg-fiado border-fiado text-white' : 'bg-fuchsia-50/50 border-fuchsia-100',
              )}
            >
              <span className={cx('size-9 rounded-lg grid place-items-center', mode === 'fiado' ? 'bg-white/20' : 'bg-fuchsia-100 text-fiado')}>
                <Receipt size={17} />
              </span>
              <span className="flex-1">
                <span className="block font-bold text-sm">Crédito fiado</span>
                <span className={cx('block text-[11px]', mode === 'fiado' ? 'text-white/80' : 'text-muted')}>
                  {customer ? `A la cuenta de ${customer.name}` : 'Cuenta corriente del cliente'}
                </span>
              </span>
              {!customer && <span className="text-sm font-bold text-fiado">Asociar</span>}
            </button>

            {(mode === 'efectivo_usd' || mode === 'efectivo_bs') && (
              <div className="mt-4">
                <Field label={`Monto recibido en ${info!.bs ? 'Bs' : '$'}`}>
                  <Input inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} placeholder={info!.bs ? (total * rate).toFixed(2) : total.toFixed(2)} />
                </Field>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(info!.bs ? quickBs(total * rate) : [1, 5, 10, 20, 50, 100].filter((v) => v >= total || v === 100).slice(0, 5)).map((v) => (
                    <button key={v} onClick={() => setReceived(String(v))} className="h-9 px-3 rounded-xl bg-canvas border border-line text-sm font-semibold tabular active:scale-95">
                      {info!.bs ? bs(v).replace(',00', '') : `$${v}`}
                    </button>
                  ))}
                  <button onClick={() => setReceived('')} className="h-9 px-3 rounded-xl bg-brand-50 text-brand-700 text-sm font-semibold active:scale-95">
                    Exacto
                  </button>
                </div>
                <ChangeBox change={change} rate={rate} missing={remaining} />
              </div>
            )}
            {(mode === 'pago_movil' || mode === 'punto' || mode === 'transferencia' || mode === 'biopago' || mode === 'zelle') && (
              <div className="mt-4 space-y-3">
                {mode === 'pago_movil' && (
                  <div className="rounded-2xl bg-violet-50 text-violet-900 p-3.5 text-sm">
                    <p className="font-bold mb-1">Datos para el Pago Móvil</p>
                    <p>{s.pagoMovil.bank}</p>
                    <p className="tabular">
                      {s.pagoMovil.phone} · {s.pagoMovil.idNumber}
                    </p>
                    <p className="mt-1.5 font-extrabold text-lg tabular">{toBs(total, rate)}</p>
                  </div>
                )}
                {mode !== 'zelle' && mode !== 'pago_movil' && <p className="text-sm text-muted">Monto a cobrar: <b className="text-ink tabular">{toBs(total, rate)}</b></p>}
                <Field label="Referencia (opcional)">
                  <Input inputMode="numeric" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Últimos dígitos" />
                </Field>
              </div>
            )}
            {mode === 'mixto' && (
              <div className="mt-4 space-y-2.5">
                {mix.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <select
                      value={r.method}
                      onChange={(e) => setMix(mix.map((x, j) => (j === i ? { ...x, method: e.target.value as PaymentMethod } : x)))}
                      className="h-12 rounded-2xl bg-canvas border border-line px-3 font-semibold text-sm flex-1 min-w-0"
                    >
                      {[...s.enabledPayments, 'fiado' as PaymentMethod].map((m) => (
                        <option key={m} value={m}>
                          {PAYMENT_INFO[m].label}
                        </option>
                      ))}
                    </select>
                    <Input className="w-32" inputMode="decimal" placeholder={PAYMENT_INFO[r.method].bs ? 'Bs' : '$'} value={r.value} onChange={(e) => setMix(mix.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                    <button className="text-muted px-1" onClick={() => setMix(mix.filter((_, j) => j !== i))} aria-label="Quitar">
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setMix([...mix, { method: 'efectivo_bs', value: '' }])}>
                    <Plus size={15} /> Agregar pago
                  </Button>
                  {remaining > 0 && (
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() => {
                        const last = mix.findIndex((r) => !parseNum(r.value))
                        const m = last >= 0 ? mix[last].method : 'efectivo_usd'
                        const v = PAYMENT_INFO[m].bs ? (remaining * rate).toFixed(2) : remaining.toFixed(2)
                        if (last >= 0) setMix(mix.map((x, j) => (j === last ? { ...x, value: v } : x)))
                        else setMix([...mix, { method: m, value: v }])
                      }}
                    >
                      Completar resto
                    </Button>
                  )}
                </div>
                <ChangeBox change={change} rate={rate} missing={remaining} />
                {payments.some((p) => p.method === 'fiado') && !cart.customerId && <p className="text-sm font-semibold text-fiado">Para fiar, asocia un cliente.</p>}
              </div>
            )}
            {mode === 'fiado' && (
              <p className="mt-4 text-sm rounded-2xl bg-fuchsia-50 text-fuchsia-800 p-3.5">
                Se anotarán <b>{usd(total)}</b> en el cuaderno de <b>{customer?.name}</b>. Podrá abonar cuando quiera desde Historial → Fiados.
              </p>
            )}
          </Card>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-surface/95 backdrop-blur border-t border-line pb-safe">
        <div className="max-w-lg mx-auto px-4 py-3">
          <Button size="lg" className="w-full" disabled={busy || (tab === 'venta' && !valid)} onClick={confirm}>
            {tab === 'venta' ? (
              <>
                <Printer size={19} /> Confirmar venta y emitir ticket
              </>
            ) : (
              <>
                <FileText size={19} /> Guardar cotización
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted text-center mt-1.5">
            {tab === 'venta' ? (s.printing.autoPrint ? 'Se imprime solo si hay impresora conectada' : 'Podrás imprimir o enviar el ticket') : `Válida por ${s.quoteValidityDays} días`}
          </p>
        </div>
      </div>

      <CustomerPicker open={pickCustomer} onClose={() => setPickCustomer(false)} onPick={(id) => cart.setCustomer(id)} />
      <VentaLibreSheet open={libre} onClose={() => setLibre(false)} />
    </>
  )
}

function quickBs(totalBs: number) {
  const steps = [100, 200, 500, 1000, 2000, 5000, 10000, 20000]
  const out = steps.filter((v) => v >= totalBs).slice(0, 3)
  const r = Math.ceil(totalBs / 100) * 100
  return [...new Set([r, ...out])].slice(0, 4)
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cx('flex justify-between text-sm', className)}>
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular">{value}</span>
    </div>
  )
}

function ChangeBox({ change, rate, missing }: { change: number; rate: number; missing: number }) {
  if (missing > 0.004)
    return (
      <div className="mt-3 flex justify-between px-4 py-3 rounded-2xl bg-red-50 text-red-600 font-semibold text-sm">
        <span>Falta</span>
        <span className="tabular">
          {usd(missing)} · {toBs(missing, rate)}
        </span>
      </div>
    )
  if (change <= 0) return null
  return (
    <div className="mt-3 px-4 py-3 rounded-2xl bg-brand-50 text-brand-800">
      <div className="flex justify-between items-baseline">
        <span className="font-semibold">Vuelto</span>
        <span className="text-xl font-extrabold tabular">{usd(change)}</span>
      </div>
      <p className="text-right text-sm font-semibold tabular">o {toBs(change, rate)}</p>
    </div>
  )
}

function Done({ done, onNew, customerPhone }: { done: { kind: 'sale'; data: Sale } | { kind: 'quote'; data: Quote }; onNew: () => void; customerPhone?: string }) {
  const s = useSettings()
  const d = done.data
  const isSale = done.kind === 'sale'
  const [printing, setPrinting] = useState(false)
  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto px-5 pt-safe">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className={cx('size-24 rounded-full grid place-items-center text-white animate-pop', isSale ? 'bg-brand-500' : 'bg-quote')}>
          <Check size={48} strokeWidth={3} />
        </div>
        <p className="text-2xl font-extrabold mt-5">{isSale ? (done.data.status === 'fiada' ? '¡Fiado anotado!' : '¡Venta registrada!') : '¡Cotización guardada!'}</p>
        <p className="text-muted mt-1">
          {isSale ? 'Ticket' : 'Cotización'} #{String(d.number).padStart(6, '0')}
        </p>
        <p className="text-4xl font-extrabold tabular mt-5">{usd(d.total)}</p>
        <p className="text-muted font-semibold tabular">{toBs(d.total, d.rate)}</p>
        {isSale && done.data.change > 0 && (
          <div className="mt-5 px-5 py-3 rounded-2xl bg-brand-50 text-brand-800">
            <p className="text-sm font-semibold">Vuelto</p>
            <p className="text-2xl font-extrabold tabular">{usd(done.data.change)}</p>
            <p className="text-sm font-semibold tabular">o {toBs(done.data.change, d.rate)}</p>
          </div>
        )}
      </div>
      <div className="grid gap-3 pb-8">
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            variant="outline"
            disabled={printing}
            onClick={async () => {
              setPrinting(true)
              const how = await printDoc(done, s)
              if (how === 'bluetooth') toast('Ticket enviado a la impresora')
              setPrinting(false)
            }}
          >
            <Printer size={19} /> Imprimir
          </Button>
          <Button size="lg" variant="outline" onClick={() => shareWhatsApp(done, s, customerPhone)}>
            <MessageCircle size={19} className="text-[#25d366]" /> WhatsApp
          </Button>
        </div>
        <Button size="lg" onClick={onNew}>
          Nueva venta
        </Button>
      </div>
    </div>
  )
}
