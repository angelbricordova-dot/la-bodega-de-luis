import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, ShoppingBasket, Trash2 } from 'lucide-react'
import { db, type Product } from '../../db'
import { Button, Card, Empty, Field, Input, Sheet, toast } from '../../components/ui'
import { parseNum, round2, usd } from '../../lib/money'

export default function Compras() {
  const [open, setOpen] = useState(false)
  const purchases = useLiveQuery(() => db.purchases.orderBy('createdAt').reverse().toArray(), [])
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Registra la mercancía que llega del proveedor: suma el stock y actualiza el costo.</p>
      <Button className="w-full" size="lg" onClick={() => setOpen(true)}><Plus size={18} /> Registrar compra</Button>
      {!purchases?.length && <Empty icon={<ShoppingBasket size={26} />} title="Sin compras" />}
      {purchases?.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex justify-between">
            <div>
              <p className="font-bold">{p.supplier || 'Proveedor'}</p>
              <p className="text-xs text-muted">{new Date(p.createdAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })} · {p.items.length} productos</p>
            </div>
            <p className="font-extrabold tabular">{usd(p.total)}</p>
          </div>
          <p className="text-xs text-muted mt-2 line-clamp-2">{p.items.map((i) => `${i.qty} ${i.name}`).join(', ')}</p>
        </Card>
      ))}
      {open && <NewPurchase onClose={() => setOpen(false)} />}
    </div>
  )
}

interface Row { product: Product; qty: string; cost: string }

function NewPurchase({ onClose }: { onClose: () => void }) {
  const [supplier, setSupplier] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), [])
  const matches = q ? (products ?? []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.barcode.includes(q)).slice(0, 6) : []
  const total = round2(rows.reduce((a, r) => a + parseNum(r.qty) * parseNum(r.cost), 0))
  const save = async () => {
    const items = rows.filter((r) => parseNum(r.qty) > 0)
    if (!items.length) return
    await db.transaction('rw', db.products, db.stockMoves, db.purchases, async () => {
      const now = Date.now()
      for (const r of items) {
        const p = await db.products.get(r.product.id!)
        if (!p) continue
        const stockAfter = Math.round((p.stock + parseNum(r.qty)) * 1000) / 1000
        await db.products.update(p.id!, { stock: stockAfter, cost: parseNum(r.cost) || p.cost, updatedAt: now })
        await db.stockMoves.add({ productId: p.id!, type: 'compra', qty: parseNum(r.qty), stockAfter, note: supplier || 'Compra', createdAt: now })
      }
      await db.purchases.add({ supplier, total, createdAt: now, items: items.map((r) => ({ productId: r.product.id!, name: r.product.name, qty: parseNum(r.qty), cost: parseNum(r.cost) })) })
    })
    toast('Compra registrada')
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title="Registrar compra" tall footer={<Button size="lg" className="w-full" disabled={!rows.length} onClick={save}>Guardar compra · {usd(total)}</Button>}>
      <div className="space-y-4">
        <Field label="Proveedor"><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ej: Distribuidora Polar" /></Field>
        <div className="relative">
          <Input icon={<Search size={18} />} placeholder="Buscar producto para agregar" value={q} onChange={(e) => setQ(e.target.value)} />
          {matches.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-line rounded-2xl shadow-lg overflow-hidden">
              {matches.map((p) => (
                <button key={p.id} className="w-full text-left px-4 py-2.5 hover:bg-canvas text-sm flex justify-between" onClick={() => { setRows([...rows, { product: p, qty: '', cost: String(p.cost) }]); setQ('') }}>
                  <span>{p.name}</span><span className="text-muted">costo {usd(p.cost)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2 items-end">
            <p className="flex-1 font-semibold text-sm pb-3 truncate">{r.product.name}</p>
            <Field label={r.product.unit === 'unidad' ? 'Cant.' : r.product.unit} className="w-20"><Input inputMode="decimal" value={r.qty} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} /></Field>
            <Field label="Costo $" className="w-24"><Input inputMode="decimal" value={r.cost} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, cost: e.target.value } : x)))} /></Field>
            <button className="h-12 text-muted" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Quitar"><Trash2 size={17} /></button>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
