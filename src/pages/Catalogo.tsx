import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, LayoutGrid, Plus, ScanBarcode, Search, ShoppingBag, Zap } from 'lucide-react'
import { db, type Product } from '../db'
import { Page, PageHeader } from '../components/Layout'
import { pickProduct, VentaLibreSheet } from '../components/AddProductSheet'
import { Scanner, useWedgeScanner } from '../components/Scanner'
import { Chip, cx, Empty, IconButton, Input, ProductThumb, Sheet, toast } from '../components/ui'
import { cartTotals, useCart } from '../store/cart'
import { useSettings } from '../lib/hooks'
import { toBs, usd } from '../lib/money'
import { findByCode } from './Venta'

export function stockBadge(p: Product) {
  const n = p.unit === 'kg' ? `${+p.stock.toFixed(2)} kg` : p.unit === 'm' ? `${+p.stock.toFixed(1)} m` : `${+p.stock.toFixed(0)} uds`
  if (p.stock <= 0) return { text: 'Agotado', tone: 'bg-red-500 text-white' }
  if (p.stock <= p.minStock) return { text: `Bajo (${n})`, tone: 'bg-red-50 text-red-600' }
  return { text: n, tone: 'bg-white/90 text-ink/70' }
}

export default function Catalogo() {
  const nav = useNavigate()
  const s = useSettings()
  const cart = useCart()
  const totals = cartTotals(cart)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<number | 'all'>('all')
  const [scan, setScan] = useState(false)
  const [libre, setLibre] = useState(false)
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (products ?? []).filter(
      (p) => (cat === 'all' || p.categoryId === cat) && (!term || p.name.toLowerCase().includes(term) || p.barcode.includes(term)),
    )
  }, [products, q, cat])

  const inCart = (id?: number) => cart.items.filter((i) => i.productId === id).reduce((a, i) => a + i.qty, 0)

  const onCode = async (code: string) => {
    const p = await findByCode(code)
    if (p) {
      setScan(false)
      pickProduct(p)
    } else toast(`Código ${code} no registrado`, { tone: 'error' })
  }
  useWedgeScanner(onCode)

  return (
    <>
      <PageHeader title="Catálogo" icon={<LayoutGrid size={20} />} />
      <Page className="pb-44">
        <div className="flex gap-2">
          <Input className="flex-1" icon={<Search size={18} />} placeholder="Buscar por nombre o código" value={q} onChange={(e) => setQ(e.target.value)} />
          <IconButton className="size-12 rounded-2xl bg-amber-50 text-amber-500" onClick={() => setLibre(true)} aria-label="Venta libre">
            <Zap size={20} />
          </IconButton>
          <IconButton className="size-12 rounded-2xl bg-surface border border-line" onClick={() => setScan(true)} aria-label="Escanear">
            <ScanBarcode size={20} />
          </IconButton>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 -mx-4 px-4 pb-1">
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>
            Todas ({products?.length ?? 0})
          </Chip>
          {categories?.map((c) => {
            const n = products?.filter((p) => p.categoryId === c.id).length ?? 0
            return (
              <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id!)}>
                {c.emoji} {c.name} ({n})
              </Chip>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <Empty icon={<Search size={26} />} title="Sin resultados" text="Prueba con otro nombre o crea el producto en Inventario." />
        ) : (
          <div className="grid grid-cols-3 gap-2.5 mt-3">
            {filtered.map((p) => {
              const b = stockBadge(p)
              const n = inCart(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => pickProduct(p)}
                  className={cx('text-left bg-surface rounded-2xl border p-1.5 active:scale-[.97] transition', n ? 'border-brand-400 ring-2 ring-brand-100' : 'border-line')}
                >
                  <div className="relative">
                    <ProductThumb product={p} category={categories?.find((c) => c.id === p.categoryId)} className="w-full aspect-square rounded-xl text-[13px]" />
                    <span className={cx('absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold', b.tone)}>{b.text}</span>
                    {n > 0 && (
                      <span className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-brand-500 text-white text-[11px] font-bold grid place-items-center animate-pop">
                        {+n.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] font-semibold leading-tight mt-1.5 line-clamp-2 min-h-[2lh] px-0.5">{p.name}</p>
                  <div className="flex items-end justify-between mt-1 px-0.5 pb-0.5">
                    <div className="leading-tight min-w-0">
                      <p className="text-[13px] font-extrabold tabular">
                        {usd(p.price)}
                        {p.unit !== 'unidad' && <span className="text-[10px] font-semibold text-muted">/{p.unit}</span>}
                      </p>
                      {s.showBs && <p className="text-[9.5px] text-muted tabular truncate">{toBs(p.price, s.rate)}</p>}
                    </div>
                    <span className="size-7 rounded-lg bg-brand-500 text-white grid place-items-center shrink-0">
                      <Plus size={17} strokeWidth={2.6} />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Page>

      {cart.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-30 pb-safe pointer-events-none">
          <div className="max-w-lg mx-auto px-4 pb-3 pointer-events-auto">
            <div className="h-16 rounded-2xl bg-ink text-white flex items-center pl-3 pr-2 gap-3 shadow-xl animate-fade">
              <span className="relative size-10 rounded-xl bg-brand-500 grid place-items-center">
                <ShoppingBag size={19} />
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-white text-ink text-[11px] font-bold grid place-items-center">{cart.items.length}</span>
              </span>
              <div className="flex-1 leading-tight">
                <p className="text-xs text-white/60">{totals.count} productos</p>
                <p className="font-extrabold text-lg tabular">{usd(totals.total)}</p>
              </div>
              <button onClick={() => nav('/orden')} className="h-12 px-4 rounded-xl bg-brand-500 font-bold flex items-center gap-1.5 active:scale-95 transition">
                Ir a pagar <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      <Sheet open={scan} onClose={() => setScan(false)} title="Escanear producto">
        <Scanner onDetect={onCode} compact />
      </Sheet>
      <VentaLibreSheet open={libre} onClose={() => setLibre(false)} />
    </>
  )
}
