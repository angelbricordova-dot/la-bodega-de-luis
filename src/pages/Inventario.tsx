import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, Barcode, Boxes, History, Package, Pencil, Plus, Printer, Search, SlidersHorizontal, Wallet } from 'lucide-react'
import { db, type Product } from '../db'
import { Page, PageHeader } from '../components/Layout'
import { Badge, Button, Card, Chip, Empty, Field, IconButton, Input, ProductThumb, Segmented, Sheet, toast } from '../components/ui'
import { parseNum, stockFmt, usd } from '../lib/money'
import { printHtml } from '../lib/ticket'
import { useSettings } from '../lib/hooks'

type Filter = 'todos' | 'bajo' | 'agotados' | 'vencer'

export default function Inventario() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const filter = (params.get('f') as Filter) || 'todos'
  const [q, setQ] = useState('')
  const [adjust, setAdjust] = useState<Product | null>(null)
  const [history, setHistory] = useState<Product | null>(null)
  const s = useSettings()
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const soon = Date.now() + 7 * 864e5
  const stats = useMemo(() => {
    const list = products ?? []
    return {
      skus: list.length,
      invested: list.reduce((a, p) => a + Math.max(0, p.stock) * p.cost, 0),
      retail: list.reduce((a, p) => a + Math.max(0, p.stock) * p.price, 0),
      restock: list.filter((p) => p.stock <= p.minStock).length,
      low: list.filter((p) => p.stock > 0 && p.stock <= p.minStock).length,
      out: list.filter((p) => p.stock <= 0).length,
      exp: list.filter((p) => p.expiry && new Date(p.expiry).getTime() <= soon).length,
    }
  }, [products, soon])

  const filtered = (products ?? []).filter((p) => {
    const term = q.trim().toLowerCase()
    if (term && !p.name.toLowerCase().includes(term) && !p.barcode.includes(term)) return false
    if (filter === 'bajo') return p.stock > 0 && p.stock <= p.minStock
    if (filter === 'agotados') return p.stock <= 0
    if (filter === 'vencer') return !!p.expiry && new Date(p.expiry).getTime() <= soon
    return true
  })

  const setFilter = (f: Filter) => setParams(f === 'todos' ? {} : { f }, { replace: true })

  const printReport = () => {
    const rows = (products ?? [])
      .map((p) => `<tr><td>${p.name}</td><td style="text-align:right">${stockFmt(p.stock, p.unit)}</td><td style="text-align:right">${usd(p.cost)}</td><td style="text-align:right">${usd(p.price)}</td></tr>`)
      .join('')
    printHtml(
      `<h3 style="margin:0">${s.business.name} — Inventario</h3><p>${new Date().toLocaleString('es-VE')}</p>
      <table style="width:100%;border-collapse:collapse;font-size:10px"><tr><th align="left">Producto</th><th>Stock</th><th>Costo</th><th>Precio</th></tr>${rows}</table>
      <p><b>Invertido:</b> ${usd(stats.invested)} · <b>Valor venta:</b> ${usd(stats.retail)}</p>`,
      s.printing.paperWidth,
    )
  }

  return (
    <>
      <PageHeader title="Inventario" icon={<Package size={20} />} />
      <Page>
        <div className="grid grid-cols-3 gap-2.5">
          <Kpi icon={<Boxes size={15} />} label="SKUs" value={String(stats.skus)} sub="Productos" />
          <Kpi icon={<Wallet size={15} />} label="Costo" value={usd(stats.invested)} sub="Invertido" />
          <Kpi icon={<AlertTriangle size={15} />} label="Reponer" value={String(stats.restock)} sub="Por agotar" danger={stats.restock > 0} onClick={() => setFilter('bajo')} />
        </div>

        <div className="flex gap-2 mt-4">
          <Button className="flex-1" size="lg" onClick={() => nav('/inventario/nuevo')}>
            <Plus size={20} /> Nuevo producto
          </Button>
          <IconButton className="size-14 rounded-2xl bg-surface border border-line text-ink" onClick={() => nav('/etiquetas')} aria-label="Códigos de barras">
            <Barcode size={21} />
          </IconButton>
          <IconButton className="size-14 rounded-2xl bg-surface border border-line text-ink" onClick={printReport} aria-label="Imprimir inventario">
            <Printer size={21} />
          </IconButton>
        </div>

        <Input className="mt-4" icon={<Search size={18} />} placeholder="Buscar por nombre o código" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 -mx-4 px-4">
          <Chip active={filter === 'todos'} onClick={() => setFilter('todos')}>
            Todos ({stats.skus})
          </Chip>
          <Chip active={filter === 'bajo'} onClick={() => setFilter('bajo')} color="#d97706">
            <span className="text-amber-500 mr-1">●</span>Stock bajo ({stats.low})
          </Chip>
          <Chip active={filter === 'agotados'} onClick={() => setFilter('agotados')} color="#ef4444">
            <span className="text-red-500 mr-1">●</span>Agotados ({stats.out})
          </Chip>
          <Chip active={filter === 'vencer'} onClick={() => setFilter('vencer')} color="#7c3aed">
            Por vencer ({stats.exp})
          </Chip>
        </div>

        <div className="space-y-2.5 mt-3">
          {filtered.length === 0 && <Empty icon={<Package size={26} />} title="Nada por aquí" text="No hay productos con este filtro." />}
          {filtered.map((p) => {
            const status = p.stock <= 0 ? { t: 'Agotado', tone: 'red' as const } : p.stock <= p.minStock ? { t: 'Stock bajo', tone: 'red' as const } : { t: 'Normal', tone: 'green' as const }
            const expiring = p.expiry && new Date(p.expiry).getTime() <= soon
            return (
              <Card key={p.id} className="p-3.5">
                <div className="flex gap-3">
                  <ProductThumb product={p} category={categories?.find((c) => c.id === p.categoryId)} className="size-12 rounded-xl shrink-0 text-[12px]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold leading-tight">{p.name}</p>
                      <Badge tone={status.tone}>{status.t}</Badge>
                    </div>
                    <p className="text-xs text-muted tabular flex items-center gap-1 mt-0.5">
                      <Barcode size={12} /> {p.barcode || 'Sin código'}
                      {expiring && <span className="ml-1 text-violet-600 font-semibold">· vence {p.expiry}</span>}
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl bg-canvas px-3.5 py-2.5 flex justify-between items-end">
                  <div>
                    <p className="text-[11px] text-muted font-semibold">Precio / Costo</p>
                    <p className="font-bold tabular text-sm">
                      {usd(p.price)} · <span className="text-muted">{usd(p.cost)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted font-semibold">Existencias</p>
                    <p className={`font-extrabold tabular ${p.stock <= p.minStock ? 'text-red-500' : 'text-brand-600'}`}>{stockFmt(p.stock, p.unit)}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2.5">
                  <IconButton className="size-9" onClick={() => setHistory(p)} aria-label="Movimientos">
                    <History size={17} />
                  </IconButton>
                  <Button size="sm" variant="outline" onClick={() => nav(`/inventario/${p.id}`)}>
                    <Pencil size={14} /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAdjust(p)}>
                    <SlidersHorizontal size={14} /> Ajustar
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </Page>
      {adjust && <AdjustSheet product={adjust} onClose={() => setAdjust(null)} />}
      {history && <HistorySheet product={history} onClose={() => setHistory(null)} />}
    </>
  )
}

function Kpi({ icon, label, value, sub, danger, onClick }: { icon: React.ReactNode; label: string; value: string; sub: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`text-left rounded-2xl p-3 border ${danger ? 'bg-red-50 border-red-100' : 'bg-surface border-line'}`}>
      <p className={`text-[11px] font-semibold flex items-center gap-1 ${danger ? 'text-red-500' : 'text-muted'}`}>
        {icon} {label}
      </p>
      <p className={`text-lg font-extrabold tabular leading-tight mt-1 truncate ${danger ? 'text-red-600' : ''}`}>{value}</p>
      <p className={`text-[10.5px] ${danger ? 'text-red-400' : 'text-muted'}`}>{sub}</p>
    </button>
  )
}

function AdjustSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const [mode, setMode] = useState<'sumar' | 'restar' | 'fijar'>('sumar')
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const n = parseNum(value)
  const after = mode === 'sumar' ? product.stock + n : mode === 'restar' ? product.stock - n : n
  const save = async () => {
    const stockAfter = Math.round(after * 1000) / 1000
    await db.products.update(product.id!, { stock: stockAfter, updatedAt: Date.now() })
    await db.stockMoves.add({ productId: product.id!, type: 'ajuste', qty: stockAfter - product.stock, stockAfter, note: note || mode, createdAt: Date.now() })
    toast('Stock actualizado')
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={`Ajustar: ${product.name}`}>
      <div className="space-y-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'sumar', label: '+ Entrada' },
            { value: 'restar', label: '− Salida' },
            { value: 'fijar', label: '= Conteo' },
          ]}
        />
        <Field label={mode === 'fijar' ? 'Cantidad real contada' : 'Cantidad'}>
          <Input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
        </Field>
        <div className="flex gap-2 flex-wrap">
          {['Llegó mercancía', 'Producto dañado', 'Vencido', 'Consumo propio', 'Conteo físico'].map((r) => (
            <Chip key={r} active={note === r} onClick={() => setNote(r)}>
              {r}
            </Chip>
          ))}
        </div>
        <div className="flex justify-between rounded-2xl bg-canvas p-4">
          <span className="text-muted">
            {stockFmt(product.stock, product.unit)} →
          </span>
          <span className={`font-extrabold tabular ${after < 0 ? 'text-red-500' : ''}`}>{stockFmt(after, product.unit)}</span>
        </div>
        <Button size="lg" className="w-full" onClick={save} disabled={!value}>
          Guardar ajuste
        </Button>
      </div>
    </Sheet>
  )
}

const MOVE_LABEL = { venta: 'Venta', ajuste: 'Ajuste', compra: 'Compra', anulacion: 'Anulación', inicial: 'Inicial' }

function HistorySheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const moves = useLiveQuery(() => db.stockMoves.where('productId').equals(product.id!).reverse().sortBy('createdAt'), [product.id])
  return (
    <Sheet open onClose={onClose} title="Movimientos" tall>
      <p className="text-sm text-muted -mt-1 mb-3">{product.name}</p>
      {!moves?.length && <p className="text-muted text-center py-8">Sin movimientos todavía.</p>}
      <div className="divide-y divide-line">
        {moves?.map((m) => (
          <div key={m.id} className="py-3 flex justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">
                {MOVE_LABEL[m.type]} {m.note && <span className="text-muted font-normal">· {m.note}</span>}
              </p>
              <p className="text-xs text-muted">{new Date(m.createdAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold tabular ${m.qty < 0 ? 'text-red-500' : 'text-brand-600'}`}>
                {m.qty > 0 ? '+' : ''}
                {+m.qty.toFixed(3)}
              </p>
              <p className="text-xs text-muted tabular">queda {+m.stockAfter.toFixed(3)}</p>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
