import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, Clock, CloudUpload, Gift, LogOut, MessageCircle, RefreshCw, Send, Smartphone, XCircle } from 'lucide-react'
import { Badge, Button, Card, Chip, Field, Input, Segmented, Sheet, TextArea, confirmDialog, cx, toast } from '../../components/ui'
import { backToAdmin, claimThisDevice, deviceName, loadProviderConfig, refreshLicense, signOut, signOutSafely, useAccount, useLicenseState } from '../../lib/account'
import { cloudEnabled, emailToLogin, friendlyError, supabase } from '../../lib/cloud'
import { lastCloudBackup, uploadCloudBackup } from '../../lib/backup'
import { useSettings } from '../../lib/hooks'
import { bs, parseNum, round2, usd } from '../../lib/money'

interface PaymentRow {
  id: string
  amount_usd: number
  amount_bs: number | null
  method: string
  reference: string | null
  months: number
  status: 'pendiente' | 'aprobado' | 'rechazado'
  created_at: string
  review_note: string | null
}

export const PROVIDER_METHODS: Record<string, string> = {
  pago_movil: 'Pago Móvil',
  transferencia: 'Transferencia',
  zelle: 'Zelle',
  binance: 'Binance (USDT)',
  efectivo_usd: 'Efectivo $',
}

const MODE_TONE = {
  prueba: 'green',
  activa: 'green',
  aviso: 'amber',
  gracia: 'amber',
  vencida: 'red',
  suspendida: 'red',
  conectar: 'gray',
  dispositivo: 'amber',
} as const
const MODE_LABEL = { prueba: 'Prueba gratis', activa: 'Activo', aviso: 'Por vencer', gracia: 'En gracia', vencida: 'Vencido', suspendida: 'Suspendido', conectar: 'Sin confirmar', dispositivo: 'Otro teléfono' }

export default function MiPlan() {
  const { account, license, config } = useAccount()
  const l = useLicenseState()
  const [payments, setPayments] = useState<PaymentRow[] | null>(null)
  const [report, setReport] = useState(false)
  const [busy, setBusy] = useState(false)

  const loadPayments = async () => {
    const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(20)
    if (data) setPayments(data as PaymentRow[])
  }

  useEffect(() => {
    if (account?.mode !== 'store') return
    loadPayments()
    loadProviderConfig()
  }, [account?.mode])

  if (!cloudEnabled) {
    return <Card className="p-5 text-muted">Esta copia de la app funciona solo en el teléfono, sin cuenta.</Card>
  }

  if (account?.mode === 'demo') {
    return (
      <Card className="p-5 space-y-3">
        <p className="font-bold text-lg">Modo demostración</p>
        <p className="text-sm text-muted">Estos son datos de ejemplo para mostrar la app. Nada se guarda en la nube.</p>
        {account.isAdmin ? (
          <Button className="w-full" onClick={backToAdmin}>
            Volver al panel de administrador
          </Button>
        ) : (
          <Button variant="outline" className="w-full" onClick={signOut}>
            Salir del demo
          </Button>
        )}
      </Card>
    )
  }

  const store = license?.store
  if (account?.mode !== 'store' || !store || !l) return null
  const pending = payments?.filter((p) => p.status === 'pendiente') ?? []

  const refresh = async () => {
    setBusy(true)
    try {
      await refreshLicense()
      await loadPayments()
      toast('Estado actualizado', { tone: 'info' })
    } catch (e) {
      toast(friendlyError(e), { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted">Tu plan</p>
            <p className="text-2xl font-extrabold">{store.plan === 'pro' ? 'Pro' : 'Básico'}</p>
            <p className="text-sm text-muted tabular">{usd(store.monthly_price)} al mes</p>
          </div>
          <Badge tone={MODE_TONE[l.mode]}>{MODE_LABEL[l.mode]}</Badge>
        </div>
        <div className={cx('mt-4 rounded-2xl px-4 py-3 text-sm font-semibold flex gap-2', l.canSell ? 'bg-canvas text-ink' : 'bg-red-50 text-red-700')}>
          <CalendarClock size={18} className="shrink-0" />
          <span>{l.message}</span>
        </div>
        {(store.free_months ?? 0) > 0 && (
          <p className="text-sm text-brand-700 mt-3 flex items-center gap-1.5">
            <Gift size={15} /> Has ganado {store.free_months} mes(es) gratis por referidos.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <Button variant="outline" onClick={refresh} disabled={busy}>
            <RefreshCw size={16} className={busy ? 'animate-spin' : ''} /> Actualizar
          </Button>
          <Button onClick={() => setReport(true)}>
            <Send size={16} /> Reportar pago
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <p className="font-bold flex items-center gap-2">
          <Smartphone size={18} /> Teléfonos
        </p>
        <p className="text-sm text-muted mt-1">
          {store.plan === 'pro'
            ? 'Tu plan Pro permite usar TuBodega en todos los teléfonos que quieras. Ventas, inventario y fiados se comparten al momento.'
            : 'Tu plan Básico permite vender desde 1 teléfono. Con el plan Pro puedes usar varios y ver las ventas desde tu casa.'}
        </p>
        <div className="flex justify-between text-sm mt-3 rounded-xl bg-canvas px-3 py-2">
          <span className="text-muted">Este teléfono</span>
          <span className="font-semibold">{deviceName()}</span>
        </div>
        <div className="flex justify-between text-sm mt-2 rounded-xl bg-canvas px-3 py-2">
          <span className="text-muted">Teléfonos activos esta semana</span>
          <span className="font-semibold">{license?.devicesActive ?? 1}</span>
        </div>
        {l.mode === 'dispositivo' && (
          <Button
            className="w-full mt-3"
            onClick={async () => {
              if (!(await confirmDialog('¿Usar TuBodega en este teléfono?', { text: 'El otro teléfono quedará en solo lectura: podrá ver los datos pero no vender.', ok: 'Usar este teléfono' }))) return
              try {
                await claimThisDevice()
                toast('Listo: este teléfono ya puede vender')
              } catch (e) {
                toast(friendlyError(e), { tone: 'error' })
              }
            }}
          >
            <Smartphone size={17} /> Usar TuBodega en este teléfono
          </Button>
        )}
      </Card>

      {(config?.pago_movil || config?.zelle || config?.binance) && (
        <Card className="p-4">
          <p className="font-bold mb-2">Cómo pagar</p>
          <div className="space-y-2 text-sm">
            {config.pago_movil && <PayLine label="Pago Móvil" value={config.pago_movil} />}
            {config.zelle && <PayLine label="Zelle" value={config.zelle} />}
            {config.binance && <PayLine label="Binance" value={config.binance} />}
          </div>
          <p className="text-xs text-muted mt-2">En bolívares, a la tasa BCV del día del pago.</p>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold">Mis pagos</p>
          {pending.length > 0 && <Badge tone="amber">{pending.length} por confirmar</Badge>}
        </div>
        {!payments && <p className="text-sm text-muted">Cargando…</p>}
        {payments?.length === 0 && <p className="text-sm text-muted">Aún no has reportado pagos.</p>}
        <div className="divide-y divide-line">
          {payments?.map((p) => (
            <div key={p.id} className="py-2.5 flex items-center gap-3">
              {p.status === 'aprobado' ? <CheckCircle2 size={18} className="text-brand-500" /> : p.status === 'rechazado' ? <XCircle size={18} className="text-red-500" /> : <Clock size={18} className="text-amber-500" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {usd(p.amount_usd)} · {PROVIDER_METHODS[p.method] ?? p.method} · {p.months} mes(es)
                </p>
                <p className="text-xs text-muted truncate">
                  {new Date(p.created_at).toLocaleDateString('es-VE')}
                  {p.reference && ` · ref ${p.reference}`}
                  {p.review_note && ` · ${p.review_note}`}
                </p>
              </div>
              <span className={cx('text-xs font-bold capitalize', p.status === 'aprobado' ? 'text-brand-600' : p.status === 'rechazado' ? 'text-red-500' : 'text-amber-600')}>{p.status}</span>
            </div>
          ))}
        </div>
      </Card>

      {store.referral_code && <ReferralCard code={store.referral_code} storeName={store.name} />}

      <Card className="p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Usuario</span>
          <span className="font-semibold">{emailToLogin(account.email)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Último respaldo en la nube</span>
          <span className="font-semibold">{lastCloudBackup() ? new Date(lastCloudBackup()).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : 'Aún no'}</span>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            try {
              await uploadCloudBackup(store.id)
              toast('Respaldo guardado en la nube')
            } catch (e) {
              toast(friendlyError(e), { tone: 'error' })
            }
          }}
        >
          <CloudUpload size={17} /> Respaldar ahora
        </Button>
        <Button
          variant="danger"
          className="w-full"
          onClick={async () => {
            if (await confirmDialog('¿Cerrar sesión?', { text: 'Tus datos quedan guardados en este teléfono y en la nube. Para volver a entrar necesitas tu usuario y clave.', ok: 'Cerrar sesión', danger: true })) signOutSafely()
          }}
        >
          <LogOut size={17} /> Cerrar sesión
        </Button>
      </Card>

      {report && <ReportSheet price={store.monthly_price} onClose={() => setReport(false)} onDone={loadPayments} />}
    </div>
  )
}

function PayLine({ label, value }: { label: string; value: string }) {
  return (
    <button
      className="w-full flex justify-between gap-3 rounded-xl bg-canvas px-3 py-2 text-left"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => toast('Copiado', { tone: 'info' }))
      }}
    >
      <span className="text-muted shrink-0">{label}</span>
      <span className="font-semibold text-right whitespace-pre-line">{value}</span>
    </button>
  )
}

function ReferralCard({ code, storeName }: { code: string; storeName: string }) {
  const config = useAccount((s) => s.config)
  const text = `¡Hola! En ${storeName} usamos TuBodega para las ventas, el inventario y los fiados. Si te anotas con mi código ${code} te dan la instalación a mitad de precio.${config?.whatsapp ? ` Escríbeles: https://wa.me/${config.whatsapp.replace(/\D/g, '').replace(/^0/, '58')}` : ''}`
  return (
    <Card className="p-4">
      <p className="font-bold flex items-center gap-2">
        <Gift size={18} className="text-brand-500" /> Recomienda y gana
      </p>
      <p className="text-sm text-muted mt-1">Por cada bodega que se anote con tu código y pague su primer mes, tú recibes 1 mes gratis.</p>
      <div className="flex items-center gap-2 mt-3">
        <span className="flex-1 text-center text-xl font-extrabold tracking-[.3em] rounded-2xl bg-brand-50 text-brand-700 py-2.5">{code}</span>
        <Button variant="outline" className="h-12" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')}>
          <MessageCircle size={18} className="text-[#25d366]" /> Compartir
        </Button>
      </div>
    </Card>
  )
}

function ReportSheet({ price, onClose, onDone }: { price: number; onClose: () => void; onDone: () => void }) {
  const s = useSettings()
  const [months, setMonths] = useState(1)
  const [method, setMethod] = useState('pago_movil')
  const [cur, setCur] = useState<'usd' | 'bs'>('usd')
  const expected = months === 12 ? price * 10 : price * months
  const [amount, setAmount] = useState(String(expected))
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setAmount(cur === 'usd' ? String(round2(expected)) : (expected * s.rate).toFixed(2))
  }, [months, cur, expected, s.rate])
  const amountUsd = cur === 'usd' ? parseNum(amount) : parseNum(amount) / s.rate
  const amountBs = cur === 'bs' ? parseNum(amount) : null

  const send = async () => {
    setBusy(true)
    try {
      const { error } = await supabase.rpc('report_payment', {
        p_amount_usd: round2(amountUsd),
        p_amount_bs: amountBs,
        p_method: method,
        p_reference: reference || null,
        p_note: note || null,
        p_months: months,
      })
      if (error) throw error
      toast('Pago reportado. Te avisaremos al confirmarlo.')
      onDone()
      onClose()
    } catch (e) {
      toast(friendlyError(e), { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Reportar pago">
      <div className="space-y-4">
        <div>
          <p className="text-[13px] font-semibold text-muted mb-1.5">¿Cuántos meses pagas?</p>
          <div className="flex gap-2">
            {[1, 3, 6, 12].map((m) => (
              <Chip key={m} active={months === m} onClick={() => setMonths(m)} className="flex-1">
                {m === 12 ? '1 año' : `${m} mes${m > 1 ? 'es' : ''}`}
              </Chip>
            ))}
          </div>
          {months === 12 && <p className="text-xs text-brand-700 mt-1.5">Pagas 10 meses y recibes 12.</p>}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-muted mb-1.5">Cómo pagaste</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PROVIDER_METHODS).map(([k, v]) => (
              <Chip key={k} active={method === k} onClick={() => setMethod(k)}>
                {v}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <Field label="Monto pagado" className="flex-1">
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <div className="w-28">
            <Segmented value={cur} onChange={setCur} options={[{ value: 'usd', label: '$' }, { value: 'bs', label: 'Bs' }]} />
          </div>
        </div>
        {cur === 'bs' && <p className="text-sm text-muted -mt-2">≈ {usd(amountUsd)} a tasa {s.rate.toFixed(2)} · esperado {bs(expected * s.rate)}</p>}
        <Field label="Referencia o número de operación">
          <Input inputMode="numeric" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Últimos 4 a 6 dígitos" />
        </Field>
        <Field label="Nota (opcional)">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: pagué desde la cuenta de mi esposa" />
        </Field>
        <Button size="lg" className="w-full" disabled={busy || amountUsd <= 0} onClick={send}>
          <Send size={18} /> Enviar reporte de {usd(amountUsd)}
        </Button>
      </div>
    </Sheet>
  )
}
