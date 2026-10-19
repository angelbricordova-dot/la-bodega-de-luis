import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bluetooth, Printer, ReceiptText, Search, Settings2, Sticker } from 'lucide-react'
import { db, updateSettings, type Product } from '../db'
import { PageHeader } from '../components/Layout'
import { BarcodeSvg, Button, Card, Input, Segmented, Stepper, cx, toast } from '../components/ui'
import { useSettings } from '../lib/hooks'
import { usd } from '../lib/money'
import { printLabels, type LabelJob } from '../lib/ticket'
import { connectPrinter, onPrinterChange, printerStatus } from '../lib/bluetooth'

export function usePrinter(role: 'ticket' | 'label') {
  const [st, setSt] = useState(printerStatus(role))
  useEffect(() => {
    const off = onPrinterChange(() => setSt(printerStatus(role)))
    setSt(printerStatus(role))
    return () => {
      off()
    }
  }, [role])
  return st
}

const priceLabel = (p: Product) => `${usd(p.price)}${p.unit !== 'unidad' ? '/' + p.unit : ''}`

export default function Etiquetas() {
  const nav = useNavigate()
  const s = useSettings()
  const role = s.printing.labelMode === 'ticket' ? 'ticket' : 'label'
  const printer = usePrinter(role)
  const [q, setQ] = useState('')
  const [copies, setCopies] = useState<Record<number, number>>({})
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), [])
  const list = (products ?? []).filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.barcode.includes(q))

  const job = (p: Product): LabelJob => ({ name: p.name, price: priceLabel(p), barcode: p.barcode, copies: copies[p.id!] ?? 1 })

  const print = async (jobs: LabelJob[]) => {
    const how = await printLabels(jobs, s)
    if (how === 'bluetooth') toast(`${jobs.reduce((a, j) => a + j.copies, 0)} etiquetas enviadas`)
  }

  const connect = async () => {
    try {
      await connectPrinter(role)
      toast('Impresora conectada')
    } catch (e) {
      toast((e as Error).message, { tone: 'error' })
    }
  }

  const sel = list.filter((p) => selected.has(p.id!))

  return (
    <>
      <PageHeader
        title="Códigos de barras"
        back
        right={
          <button onClick={() => nav('/ajustes/impresion')} className="size-10 grid place-items-center text-muted" aria-label="Configurar">
            <Settings2 size={20} />
          </button>
        }
      />
      <main className="max-w-lg mx-auto px-4 pb-32 space-y-3">
        <Segmented
          value={s.printing.labelMode}
          onChange={(v) => updateSettings({ printing: { ...s.printing, labelMode: v } })}
          options={[
            { value: 'sticker', label: <><Sticker size={15} /> Sticker</> },
            { value: 'ticket', label: <><ReceiptText size={15} /> Papel de ticket</> },
          ]}
        />
        {s.printing.labelMode === 'sticker' && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-muted">Idioma</span>
            <div className="flex-1">
              <Segmented
                value={s.printing.labelLang}
                onChange={(v) => updateSettings({ printing: { ...s.printing, labelLang: v } })}
                options={[
                  { value: 'TSPL', label: 'TSPL' },
                  { value: 'CPCL', label: 'CPCL' },
                ]}
              />
            </div>
          </div>
        )}
        <div
          className={cx(
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold',
            printer.connected ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600',
          )}
        >
          <span className={cx('size-2 rounded-full', printer.connected ? 'bg-brand-500' : 'bg-red-500')} />
          <span className="flex-1">
            {printer.connected ? `Conectada: ${printer.name}` : printer.name ? `Desconectada: ${printer.name}` : 'Sin impresora. Se usará el diálogo de impresión.'}
          </span>
          {!printer.connected && (
            <button onClick={connect} className="flex items-center gap-1 font-bold underline">
              <Bluetooth size={15} /> Conectar
            </button>
          )}
        </div>
        <Input icon={<Search size={18} />} placeholder="Buscar por nombre o código" value={q} onChange={(e) => setQ(e.target.value)} />
        {list.map((p) => (
          <Card key={p.id} className={cx('p-4', selected.has(p.id!) && 'border-brand-400 ring-2 ring-brand-100')}>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="size-5 accent-[#2f9e6e]"
                checked={selected.has(p.id!)}
                onChange={(e) => {
                  const n = new Set(selected)
                  if (e.target.checked) n.add(p.id!)
                  else n.delete(p.id!)
                  setSelected(n)
                }}
              />
              <span className="flex-1 font-bold">{p.name}</span>
              <span className="font-bold tabular">{priceLabel(p)}</span>
            </label>
            <div className="flex justify-center my-3">
              <BarcodeSvg code={p.barcode} height={46} className="max-w-full" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Cantidad de etiquetas</span>
              <Stepper value={copies[p.id!] ?? 1} min={1} onChange={(v) => setCopies({ ...copies, [p.id!]: v })} />
            </div>
            <Button variant="outline" className="w-full mt-3" onClick={() => print([job(p)])}>
              <Printer size={16} /> Imprimir {(copies[p.id!] ?? 1) > 1 ? `${copies[p.id!]} etiquetas` : 'etiqueta'}
            </Button>
          </Card>
        ))}
      </main>
      {sel.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-surface/95 backdrop-blur border-t border-line pb-safe">
          <div className="max-w-lg mx-auto px-4 py-3">
            <Button size="lg" className="w-full" onClick={() => print(sel.map(job))}>
              <Printer size={19} /> Imprimir seleccionadas ({sel.reduce((a, p) => a + (copies[p.id!] ?? 1), 0)})
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
