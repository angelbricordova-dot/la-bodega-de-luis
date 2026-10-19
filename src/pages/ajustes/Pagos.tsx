import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { updateSettings, type PaymentMethod } from '../../db'
import { Button, Card, Field, Input, cx, toast } from '../../components/ui'
import { useSettings } from '../../lib/hooks'
import { PAYMENT_INFO, parseNum, usd, toBs } from '../../lib/money'
import { fetchBcvRate } from '../../lib/rate'

const ALL: PaymentMethod[] = ['efectivo_usd', 'efectivo_bs', 'pago_movil', 'punto', 'zelle', 'biopago', 'transferencia']

export default function Pagos() {
  const s = useSettings()
  const [rate, setRate] = useState(String(s.rate))
  const [pm, setPm] = useState(s.pagoMovil)
  const [loading, setLoading] = useState(false)
  useEffect(() => setRate(String(s.rate)), [s.rate])
  useEffect(() => setPm(s.pagoMovil), [s.pagoMovil])

  const saveRate = async (v: number) => {
    if (!(v > 0)) return toast('Tasa inválida', { tone: 'error' })
    await updateSettings({ rate: v, rateUpdatedAt: Date.now() })
    toast(`Tasa actualizada: ${v.toFixed(2)} Bs/$`)
  }
  const fetchRate = async () => {
    setLoading(true)
    const r = await fetchBcvRate()
    setLoading(false)
    if (r) {
      setRate(r.toFixed(2))
      await saveRate(Math.round(r * 100) / 100)
    } else toast('No se pudo consultar. Escríbela a mano.', { tone: 'error' })
  }
  const toggle = (m: PaymentMethod) => {
    const on = s.enabledPayments.includes(m)
    const next = on ? s.enabledPayments.filter((x) => x !== m) : ALL.filter((x) => x === m || s.enabledPayments.includes(x))
    if (!next.length) return
    updateSettings({ enabledPayments: next })
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div>
          <p className="font-bold">Tasa del dólar (Bs por $)</p>
          <p className="text-xs text-muted">
            {s.rateUpdatedAt ? `Actualizada ${new Date(s.rateUpdatedAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}` : 'Aún no actualizada'}. Los precios se guardan en $ y se muestran en Bs con esta tasa.
          </p>
        </div>
        <div className="flex gap-2">
          <Input className="flex-1" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
          <Button className="h-12" onClick={() => saveRate(parseNum(rate))}>Guardar</Button>
        </div>
        <Button variant="soft" className="w-full" onClick={fetchRate} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Consultar tasa BCV (requiere internet)
        </Button>
        <p className="text-sm text-muted text-center">Ejemplo: {usd(1)} = {toBs(1, s.rate)}</p>
        <label className="flex items-center justify-between pt-1">
          <span className="font-semibold text-sm">Mostrar precios en Bs</span>
          <input type="checkbox" className="size-5 accent-[#2f9e6e]" checked={s.showBs} onChange={(e) => updateSettings({ showBs: e.target.checked })} />
        </label>
      </Card>

      <Card className="p-4">
        <p className="font-bold mb-3">Métodos de pago activos</p>
        <div className="space-y-2">
          {ALL.map((m) => {
            const on = s.enabledPayments.includes(m)
            return (
              <button key={m} onClick={() => toggle(m)} className={cx('w-full flex items-center gap-3 p-3 rounded-2xl border text-left', on ? 'border-brand-300 bg-brand-50/50' : 'border-line')}>
                <span className="size-3 rounded-full" style={{ background: PAYMENT_INFO[m].color }} />
                <span className="flex-1">
                  <span className="block font-semibold text-sm">{PAYMENT_INFO[m].label}</span>
                  <span className="block text-xs text-muted">{PAYMENT_INFO[m].hint}</span>
                </span>
                <input type="checkbox" readOnly checked={on} className="size-5 accent-[#2f9e6e] pointer-events-none" />
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted mt-3">"Crédito fiado" y "Pago mixto" siempre están disponibles.</p>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="font-bold">Datos de Pago Móvil</p>
        <p className="text-xs text-muted -mt-2">Se muestran al cliente al cobrar y salen en el ticket de WhatsApp.</p>
        <Field label="Banco"><Input value={pm.bank} onChange={(e) => setPm({ ...pm, bank: e.target.value })} /></Field>
        <Field label="Teléfono"><Input inputMode="tel" value={pm.phone} onChange={(e) => setPm({ ...pm, phone: e.target.value })} /></Field>
        <Field label="Cédula / RIF"><Input value={pm.idNumber} onChange={(e) => setPm({ ...pm, idNumber: e.target.value })} /></Field>
        <Button className="w-full" onClick={async () => { await updateSettings({ pagoMovil: pm }); toast('Guardado') }}>Guardar</Button>
      </Card>
    </div>
  )
}
