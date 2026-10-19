import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Pencil, PackagePlus, ScanBarcode, ShoppingBag, Trash2, Zap } from 'lucide-react'
import { db, type LineItem } from '../db'
import { Page, PageHeader } from '../components/Layout'
import { Scanner, useWedgeScanner } from '../components/Scanner'
import { pickProduct, VentaLibreSheet } from '../components/AddProductSheet'
import { Button, Card, Empty, Field, Input, ProductThumb, Sheet, Stepper, toast } from '../components/ui'
import { cartTotals, useCart } from '../store/cart'
import { useSettings } from '../lib/hooks'
import { parseNum, round2, toBs, usd } from '../lib/money'

export async function findByCode(code: string) {
  return db.products.where('barcode').equals(code.trim()).first()
}

export default function Venta() {
  const nav = useNavigate()
  const s = useSettings()
  const cart = useCart()
  const totals = cartTotals(cart)
  const [libre, setLibre] = useState(false)
  const [unknown, setUnknown] = useState('')
  const [editing, setEditing] = useState<LineItem | null>(null)
  const products = useLiveQuery(() => db.products.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const byId = new Map(products?.map((p) => [p.id, p]))

  const onCode = async (code: string) => {
    const p = await findByCode(code)
    if (p) pickProduct(p)
    else setUnknown(code)
  }
  useWedgeScanner(onCode)

  return (
    <>
      <PageHeader title="Venta" icon={<ScanBarcode size={20} />} />
      <Page className="pb-44">
        <Scanner onDetect={onCode} />

        <div className="flex items-center justify-between mt-5 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[17px] whitespace-nowrap">Carrito actual</h2>
            <span className="px-2 py-0.5 rounded-full bg-surface border border-line text-xs font-semibold text-muted whitespace-nowrap">
              {cart.items.length} items
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="soft" className="whitespace-nowrap" onClick={() => setLibre(true)}>
              <Zap size={15} /> Venta libre
            </Button>
            {cart.items.length > 0 && (
              <Button size="sm" variant="ghost" className="text-red-500 px-2" onClick={() => cart.clear()} aria-label="Vaciar carrito">
                <Trash2 size={17} />
              </Button>
            )}
          </div>
        </div>

        {cart.items.length === 0 ? (
          <Card>
            <Empty icon={<ShoppingBag size={28} />} title="Lista vacía" text="Los productos escaneados con la cámara aparecerán en esta lista.">
              <Button variant="outline" onClick={() => setLibre(true)}>
                <Zap size={16} className="text-amber-500" /> Venta libre
              </Button>
            </Empty>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {cart.items
              .slice()
              .reverse()
              .map((it) => {
                const p = it.productId ? byId.get(it.productId) : undefined
                const cat = categories?.find((c) => c.id === p?.categoryId)
                const weighed = it.unitLabel === 'kg' || it.unitLabel === 'm'
                return (
                  <Card key={it.key} className="p-3 flex items-center gap-3 animate-fade">
                    <ProductThumb product={p ?? { name: it.name }} category={p ? cat : { name: '', emoji: '⚡' }} className="size-12 rounded-2xl shrink-0 text-[11px]" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{it.name}</p>
                      <button onClick={() => setEditing(it)} className="text-xs text-muted flex items-center gap-1 tabular">
                        {usd(it.unitPrice)} {weighed ? `/${it.unitLabel}` : it.unitLabel === 'c/u' ? 'c/u' : `· ${it.unitLabel}`}
                        <Pencil size={11} />
                      </button>
                      <div className="mt-1.5">
                        {weighed ? (
                          <button onClick={() => setEditing(it)} className="text-sm font-bold text-brand-700 bg-brand-50 rounded-lg px-2 py-0.5 tabular">
                            {it.unitLabel === 'kg' ? (it.qty < 1 ? `${Math.round(it.qty * 1000)} g` : `${it.qty} kg`) : `${it.qty} m`}
                          </button>
                        ) : (
                          <Stepper value={it.qty} onChange={(q) => cart.setQty(it.key, q)} />
                        )}
                      </div>
                    </div>
                    <div className="text-right self-start">
                      <p className="font-extrabold tabular">{usd(it.total)}</p>
                      {s.showBs && <p className="text-[11px] text-muted tabular">{toBs(it.total, s.rate)}</p>}
                    </div>
                  </Card>
                )
              })}
          </div>
        )}
      </Page>

      <div className="fixed inset-x-0 bottom-16 z-30 pb-safe pointer-events-none">
        <div className="max-w-lg mx-auto px-4 pb-3 pointer-events-auto">
          <button
            disabled={!cart.items.length}
            onClick={() => nav('/orden')}
            className="w-full h-14 rounded-2xl flex items-center justify-between px-5 font-bold transition active:scale-[.98] bg-brand-500 text-white shadow-[0_10px_24px_-10px_rgba(47,158,110,.9)] disabled:bg-[#e3e9e6] disabled:text-muted disabled:shadow-none"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={19} /> Revisar orden
            </span>
            {cart.items.length > 0 && (
              <span className="flex items-center gap-2 tabular">
                {usd(totals.total)} <ArrowRight size={19} />
              </span>
            )}
          </button>
        </div>
      </div>

      <VentaLibreSheet open={libre} onClose={() => setLibre(false)} />
      <Sheet open={!!unknown} onClose={() => setUnknown('')} title="Código no registrado">
        <p className="text-muted">
          El código <b className="text-ink tabular">{unknown}</b> no está en tu inventario.
        </p>
        <div className="grid gap-3 mt-5">
          <Button
            size="lg"
            onClick={() => {
              const c = unknown
              setUnknown('')
              nav(`/inventario/nuevo?barcode=${encodeURIComponent(c)}`)
            }}
          >
            <PackagePlus size={19} /> Crear producto con este código
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              setUnknown('')
              setLibre(true)
            }}
          >
            <Zap size={18} className="text-amber-500" /> Cobrar como venta libre
          </Button>
        </div>
      </Sheet>
      {editing && <EditLineSheet item={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function EditLineSheet({ item, onClose }: { item: LineItem; onClose: () => void }) {
  const weighed = item.unitLabel === 'kg' || item.unitLabel === 'm'
  const [price, setPrice] = useState(String(item.unitPrice))
  const [qty, setQty] = useState(String(item.qty))
  const save = () => {
    const q = parseNum(qty)
    const p = round2(parseNum(price))
    useCart.setState((st) => ({
      items: st.items
        .map((i) => (i.key === item.key ? { ...i, unitPrice: p, qty: q, total: round2(p * q) } : i))
        .filter((i) => i.qty > 0),
    }))
    toast('Línea actualizada', { tone: 'info' })
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={item.name}>
      <div className="space-y-4">
        <Field label={`Precio en $ ${weighed ? `por ${item.unitLabel}` : 'por unidad'}`} hint="Solo cambia el precio en esta venta.">
          <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label={weighed ? `Cantidad (${item.unitLabel})` : 'Cantidad'}>
          <Input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="danger"
            onClick={() => {
              useCart.getState().remove(item.key)
              onClose()
            }}
          >
            <Trash2 size={16} /> Quitar
          </Button>
          <Button onClick={save}>Guardar</Button>
        </div>
      </div>
    </Sheet>
  )
}
