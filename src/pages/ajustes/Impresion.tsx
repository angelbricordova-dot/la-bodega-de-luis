import { useEffect, useState } from 'react'
import { Bluetooth, BluetoothOff, Info, ReceiptText, Tag } from 'lucide-react'
import { updateSettings, type Settings } from '../../db'
import { Button, Card, Field, Input, Segmented, cx, toast } from '../../components/ui'
import { useSettings } from '../../lib/hooks'
import { bluetoothSupported, connectPrinter, disconnectPrinter, type PrinterRole } from '../../lib/bluetooth'
import { printDoc, printLabels } from '../../lib/ticket'
import { usePrinter } from '../Etiquetas'
import { parseNum } from '../../lib/money'

export default function Impresion() {
  const s = useSettings()
  const [p, setP] = useState<Settings['printing']>(s.printing)
  useEffect(() => setP(s.printing), [s.printing])
  const save = async () => {
    await updateSettings({ printing: p })
    toast('Configuración guardada')
  }
  const testTicket = () =>
    printDoc(
      {
        kind: 'sale',
        data: {
          number: 0, createdAt: Date.now(), rate: s.rate, subtotal: 1.5, discount: 0, total: 1.5, received: 2, change: 0.5, status: 'pagada', balance: 0,
          items: [{ key: 'x', name: 'Prueba de impresión', qty: 1, factor: 1, unitLabel: 'c/u', unitPrice: 1.5, unitCost: 0, total: 1.5 }],
          payments: [{ method: 'efectivo_usd', amount: 1.5 }], sellerName: s.currentSeller,
        },
      },
      { ...s, printing: p },
    )
  const testLabel = () => printLabels([{ name: 'Etiqueta de prueba', price: '$1.00', barcode: '2000000000015', copies: 1 }], { ...s, printing: p })

  return (
    <div className="space-y-4">
      {!bluetoothSupported() && (
        <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 text-amber-800 text-sm">
          <Info size={18} className="shrink-0 mt-0.5" />
          <p>Este navegador no tiene Bluetooth. Usa <b>Chrome en Android</b> para conectar la impresora térmica directo. Si no, se abrirá el diálogo de impresión del sistema (funciona con la app <b>RawBT</b>).</p>
        </div>
      )}
      <PrinterCard role="ticket" title="Tickets" icon={<ReceiptText size={18} />} onTest={testTicket} />
      <PrinterCard role="label" title="Etiquetas (sticker)" icon={<Tag size={18} />} onTest={testLabel}>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm font-semibold text-muted w-14">Idioma</span>
          <div className="flex-1">
            <Segmented value={p.labelLang} onChange={(v) => setP({ ...p, labelLang: v })} options={[{ value: 'TSPL', label: 'TSPL' }, { value: 'CPCL', label: 'CPCL' }]} />
          </div>
        </div>
      </PrinterCard>

      <Card className="p-4 space-y-4">
        <div>
          <p className="text-[11px] font-extrabold tracking-wider text-muted mb-2">ANCHO DEL ROLLO TÉRMICO</p>
          <div className="grid grid-cols-2 gap-2.5">
            {([58, 80] as const).map((w) => (
              <button key={w} onClick={() => setP({ ...p, paperWidth: w })} className={cx('p-3 rounded-2xl border text-left', p.paperWidth === w ? 'bg-brand-500 border-brand-500 text-white' : 'border-line')}>
                <span className="block font-bold">{w} mm</span>
                <span className={cx('block text-xs', p.paperWidth === w ? 'text-white/80' : 'text-muted')}>{w === 58 ? 'Mini portátil' : 'Estándar'}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-extrabold tracking-wider text-muted mb-2">ETIQUETAS DE PRODUCTO (MODO STICKER)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ancho (mm)"><Input inputMode="numeric" value={p.labelWidth} onChange={(e) => setP({ ...p, labelWidth: parseNum(e.target.value) })} /></Field>
            <Field label="Alto (mm)"><Input inputMode="numeric" value={p.labelHeight} onChange={(e) => setP({ ...p, labelHeight: parseNum(e.target.value) })} /></Field>
          </div>
          <p className="text-xs text-muted mt-1.5">El tamaño de tu sticker. Míde el rollo que compraste.</p>
        </div>
        <Toggle label="Imprimir ticket automáticamente al vender" checked={p.autoPrint} onChange={(v) => setP({ ...p, autoPrint: v })} />
        <Toggle label="Imprimir logo en el ticket" checked={p.printLogo} onChange={(v) => setP({ ...p, printLogo: v })} />
      </Card>
      <Button size="lg" className="w-full" onClick={save}>Guardar configuración</Button>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">{label}</span>
      <input type="checkbox" className="size-5 accent-[#2f9e6e]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

function PrinterCard({ role, title, icon, onTest, children }: { role: PrinterRole; title: string; icon: React.ReactNode; onTest: () => void; children?: React.ReactNode }) {
  const st = usePrinter(role)
  const connect = async () => {
    try {
      await connectPrinter(role)
      toast('Impresora conectada')
    } catch (e) {
      if ((e as Error).name !== 'NotFoundError') toast((e as Error).message, { tone: 'error' })
    }
  }
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className="text-muted">{icon}</span>
        <p className="font-bold flex-1">{title}</p>
        <span className={cx('text-xs font-bold flex items-center gap-1', st.connected ? 'text-brand-600' : 'text-red-500')}>
          <span className={cx('size-1.5 rounded-full', st.connected ? 'bg-brand-500' : 'bg-red-500')} />
          {st.connected ? 'Conectada' : 'Desconectada'}
        </span>
      </div>
      {st.name && <p className="text-xs text-muted mt-1">{st.name}</p>}
      {children}
      <div className="grid grid-cols-2 gap-2.5 mt-3">
        {st.name ? (
          <Button variant="outline" onClick={() => disconnectPrinter(role)}><BluetoothOff size={16} /> Olvidar</Button>
        ) : (
          <Button variant="outline" onClick={connect}><Bluetooth size={16} /> Conectar</Button>
        )}
        <Button onClick={onTest}>Probar {role === 'ticket' ? 'ticket' : 'etiqueta'}</Button>
      </div>
    </Card>
  )
}
