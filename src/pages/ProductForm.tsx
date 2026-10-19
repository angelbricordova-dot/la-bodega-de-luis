import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Calendar, Camera, Package, Plus, ScanBarcode, Sparkles, Trash2, Wand2, X } from 'lucide-react'
import { db, type Presentation, type Product, type SellUnit } from '../db'
import { PageHeader } from '../components/Layout'
import { Scanner } from '../components/Scanner'
import { BarcodeSvg, Button, Card, Field, Input, Segmented, Sheet, TextArea, confirmDialog, toast } from '../components/ui'
import { generateBarcode } from '../lib/barcode'
import { fileToThumb } from '../lib/image'
import { useSettings } from '../lib/hooks'
import { parseNum, round2, toBs, usd } from '../lib/money'

interface Form {
  name: string
  barcode: string
  description: string
  categoryId?: number
  unit: SellUnit
  price: string
  cost: string
  stock: string
  minStock: string
  expiry: string
  image?: string
  presentations: { name: string; qty: string; price: string }[]
}

const empty: Form = { name: '', barcode: '', description: '', unit: 'unidad', price: '', cost: '', stock: '', minStock: '5', expiry: '', presentations: [] }

export default function ProductForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const s = useSettings()
  const isNew = !id || id === 'nuevo'
  const [f, setF] = useState<Form>({ ...empty, barcode: params.get('barcode') ?? '' })
  const [original, setOriginal] = useState<Product | null>(null)
  const [scan, setScan] = useState(false)
  const [newCat, setNewCat] = useState(false)
  const [priceCur, setPriceCur] = useState<'usd' | 'bs'>('usd')
  const fileRef = useRef<HTMLInputElement>(null)
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  useEffect(() => {
    if (isNew) return
    db.products.get(Number(id)).then((p) => {
      if (!p) return
      setOriginal(p)
      setF({
        name: p.name,
        barcode: p.barcode,
        description: p.description ?? '',
        categoryId: p.categoryId,
        unit: p.unit,
        price: String(p.price),
        cost: String(p.cost),
        stock: String(p.stock),
        minStock: String(p.minStock),
        expiry: p.expiry ?? '',
        image: p.image,
        presentations: p.presentations.map((x) => ({ name: x.name, qty: String(x.qty), price: String(x.price) })),
      })
    })
  }, [id, isNew])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const priceUsd = priceCur === 'usd' ? parseNum(f.price) : parseNum(f.price) / s.rate
  const cost = parseNum(f.cost)
  const margin = priceUsd > 0 && cost > 0 ? ((priceUsd - cost) / priceUsd) * 100 : null
  const unitWord = f.unit === 'kg' ? 'kg' : f.unit === 'm' ? 'metro' : 'unidad'

  const genCode = async () => {
    const c = await generateBarcode()
    set('barcode', c)
    toast(`Código generado: ${c}`, { tone: 'info' })
  }

  const save = async () => {
    if (!f.name.trim()) return toast('Escribe el nombre del producto', { tone: 'error' })
    const barcode = f.barcode.trim() || (await generateBarcode())
    const dup = await db.products.where('barcode').equals(barcode).first()
    if (dup && dup.id !== original?.id) return toast(`Ese código ya lo usa "${dup.name}"`, { tone: 'error' })
    const now = Date.now()
    const presentations: Presentation[] = f.presentations
      .filter((x) => x.name.trim() && parseNum(x.qty) > 0 && parseNum(x.price) > 0)
      .map((x) => ({ name: x.name.trim(), qty: parseNum(x.qty), price: round2(parseNum(x.price)) }))
    const data = {
      name: f.name.trim(),
      barcode,
      description: f.description.trim() || undefined,
      categoryId: f.categoryId,
      unit: f.unit,
      price: round2(priceUsd),
      cost: round2(cost * 10000) / 10000,
      stock: parseNum(f.stock),
      minStock: parseNum(f.minStock),
      expiry: f.expiry || undefined,
      image: f.image,
      presentations,
      updatedAt: now,
    }
    if (original) {
      await db.products.update(original.id!, data)
      if (data.stock !== original.stock) {
        await db.stockMoves.add({ productId: original.id!, type: 'ajuste', qty: data.stock - original.stock, stockAfter: data.stock, note: 'Edición', createdAt: now })
      }
      toast('Producto actualizado')
    } else {
      const pid = await db.products.add({ ...data, createdAt: now })
      if (data.stock) await db.stockMoves.add({ productId: pid, type: 'inicial', qty: data.stock, stockAfter: data.stock, createdAt: now })
      toast('Producto creado')
    }
    nav(-1)
  }

  const remove = async () => {
    if (!original) return
    if (!(await confirmDialog(`¿Eliminar "${original.name}"?`, { text: 'Las ventas pasadas se conservan.', ok: 'Eliminar', danger: true }))) return
    await db.products.delete(original.id!)
    toast('Producto eliminado', { tone: 'info' })
    nav(-1)
  }

  return (
    <>
      <PageHeader title={isNew ? 'Nuevo producto' : 'Editar producto'} back />
      <main className="max-w-lg mx-auto px-4 pb-32 space-y-4">
        <div className="flex justify-center pt-1">
          <button onClick={() => fileRef.current?.click()} className="relative size-28 rounded-3xl bg-surface border-2 border-dashed border-line grid place-items-center overflow-hidden">
            {f.image ? (
              <>
                <img src={f.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    set('image', undefined)
                  }}
                  className="absolute top-1.5 right-1.5 size-7 rounded-full bg-black/60 text-white grid place-items-center"
                >
                  <X size={15} />
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center text-muted">
                <Camera size={26} />
                <span className="text-xs font-semibold mt-1">Añadir foto</span>
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) set('image', await fileToThumb(file))
              e.target.value = ''
            }}
          />
        </div>

        <Card className="p-4 space-y-4">
          <Field label="Código de barras" hint="¿El producto no tiene código? Toca la varita y se genera uno para imprimir en etiqueta.">
            <div className="flex gap-2">
              <Input className="flex-1" icon={<ScanBarcode size={18} />} inputMode="numeric" value={f.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="Escanea o escribe" />
              <button onClick={() => setScan(true)} className="size-12 rounded-2xl bg-canvas border border-line grid place-items-center text-ink" aria-label="Escanear">
                <Camera size={19} />
              </button>
              <button onClick={genCode} className="size-12 rounded-2xl bg-brand-500 text-white grid place-items-center" aria-label="Generar código">
                <Wand2 size={19} />
              </button>
            </div>
          </Field>
          {f.barcode && (
            <div className="flex justify-center py-1">
              <BarcodeSvg code={f.barcode} height={40} className="max-w-full" />
            </div>
          )}
          <Field label="Nombre del producto">
            <Input icon={<Package size={18} />} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Harina PAN 1kg" />
          </Field>
          <Field label="Descripción (opcional)">
            <TextArea value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Marca, sabor, presentación…" />
          </Field>
          <Field label="Categoría">
            <div className="flex gap-2">
              <select
                value={f.categoryId ?? ''}
                onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : undefined)}
                className="flex-1 h-12 rounded-2xl bg-canvas border border-line px-3.5 font-medium"
              >
                <option value="">Sin categoría</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
              <button onClick={() => setNewCat(true)} className="size-12 rounded-2xl bg-canvas border border-line grid place-items-center" aria-label="Nueva categoría">
                <Plus size={19} />
              </button>
            </div>
          </Field>
          <Field label="Fecha de vencimiento (opcional)">
            <Input icon={<Calendar size={18} />} type="date" value={f.expiry} onChange={(e) => set('expiry', e.target.value)} />
          </Field>
        </Card>

        <Card className="p-4 space-y-4">
          <div>
            <p className="text-[13px] font-semibold text-muted mb-1.5">Se vende por</p>
            <Segmented
              value={f.unit}
              onChange={(u) => set('unit', u)}
              options={[
                { value: 'unidad', label: 'Unidad' },
                { value: 'kg', label: 'Kilogramo' },
                { value: 'm', label: 'Metros' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Precio de venta por ${unitWord}`}>
              <div className="relative">
                <Input inputMode="decimal" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00" />
                <button
                  onClick={() => {
                    const next = priceCur === 'usd' ? 'bs' : 'usd'
                    if (f.price) set('price', next === 'bs' ? (parseNum(f.price) * s.rate).toFixed(2) : (parseNum(f.price) / s.rate).toFixed(2))
                    setPriceCur(next)
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2 rounded-lg bg-white border border-line text-xs font-bold"
                >
                  {priceCur === 'usd' ? '$' : 'Bs'}
                </button>
              </div>
            </Field>
            <Field label={`Costo por ${unitWord} ($)`}>
              <Input inputMode="decimal" value={f.cost} onChange={(e) => set('cost', e.target.value)} placeholder="0.00" />
            </Field>
          </div>
          {priceUsd > 0 && (
            <div className="flex justify-between text-sm rounded-2xl bg-canvas px-4 py-3">
              <span className="text-muted">
                {usd(priceUsd)} = {toBs(priceUsd, s.rate)}
              </span>
              {margin != null && (
                <span className={`font-bold ${margin < 0 ? 'text-red-500' : 'text-brand-600'}`}>
                  Ganancia {margin.toFixed(0)}% ({usd(priceUsd - cost)})
                </span>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Existencia actual (${f.unit === 'unidad' ? 'uds' : f.unit})`}>
              <Input inputMode="decimal" value={f.stock} onChange={(e) => set('stock', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Avisar cuando queden">
              <Input inputMode="decimal" value={f.minStock} onChange={(e) => set('minStock', e.target.value)} placeholder="5" />
            </Field>
          </div>
        </Card>

        {f.unit === 'unidad' && (
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">Presentaciones</p>
                <p className="text-xs text-muted">Vende por docena, caja o bulto con su propio precio. Descuenta las unidades del stock.</p>
              </div>
              <Button size="sm" variant="soft" onClick={() => set('presentations', [...f.presentations, { name: '', qty: '', price: '' }])}>
                <Plus size={15} /> Añadir
              </Button>
            </div>
            <div className="space-y-2 mt-3">
              {f.presentations.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {[
                    ['1/2 Docena (x6)', 6],
                    ['Docena (x12)', 12],
                    ['Caja (x24)', 24],
                  ].map(([n, q]) => (
                    <button
                      key={n}
                      onClick={() => set('presentations', [...f.presentations, { name: String(n), qty: String(q), price: priceUsd ? (priceUsd * Number(q)).toFixed(2) : '' }])}
                      className="h-8 px-3 rounded-full border border-dashed border-line text-xs font-semibold text-muted flex items-center gap-1"
                    >
                      <Sparkles size={12} /> {n}
                    </button>
                  ))}
                </div>
              )}
              {f.presentations.map((p, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <Field label="Nombre" className="flex-1">
                    <Input value={p.name} onChange={(e) => set('presentations', f.presentations.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Caja" />
                  </Field>
                  <Field label="Uds" className="w-16">
                    <Input inputMode="numeric" value={p.qty} onChange={(e) => set('presentations', f.presentations.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
                  </Field>
                  <Field label="Precio $" className="w-24">
                    <Input inputMode="decimal" value={p.price} onChange={(e) => set('presentations', f.presentations.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                  </Field>
                  <button className="h-12 px-1 text-muted" onClick={() => set('presentations', f.presentations.filter((_, j) => j !== i))} aria-label="Quitar">
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {original && (
          <Button variant="danger" className="w-full" onClick={remove}>
            <Trash2 size={17} /> Eliminar producto
          </Button>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-surface/95 backdrop-blur border-t border-line pb-safe">
        <div className="max-w-lg mx-auto px-4 py-3">
          <Button size="lg" className="w-full" onClick={save}>
            {isNew ? 'Crear producto' : 'Guardar cambios'}
          </Button>
        </div>
      </div>

      <Sheet open={scan} onClose={() => setScan(false)} title="Escanear código">
        <Scanner
          compact
          onDetect={(c) => {
            set('barcode', c)
            setScan(false)
          }}
        />
      </Sheet>
      <NewCategorySheet
        open={newCat}
        onClose={() => setNewCat(false)}
        onCreated={(cid) => set('categoryId', cid)}
      />
    </>
  )
}

export function NewCategorySheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: number) => void }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📦')
  const EMOJIS = ['📦', '🌾', '🥤', '🧀', '🍬', '🧼', '🧴', '🥖', '🚬', '🥩', '🍎', '🥫', '🍺', '💊', '🔌', '🧸', '✏️', '🐾']
  return (
    <Sheet open={open} onClose={onClose} title="Nueva categoría">
      <div className="space-y-4">
        <Field label="Nombre">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Verduras" />
        </Field>
        <div className="grid grid-cols-9 gap-1.5">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)} className={`aspect-square rounded-xl text-xl ${emoji === e ? 'bg-brand-100 ring-2 ring-brand-400' : 'bg-canvas'}`}>
              {e}
            </button>
          ))}
        </div>
        <Button
          size="lg"
          className="w-full"
          disabled={!name.trim()}
          onClick={async () => {
            const id = await db.categories.add({ name: name.trim(), emoji })
            onCreated?.(id)
            setName('')
            toast('Categoría creada')
            onClose()
          }}
        >
          Crear categoría
        </Button>
      </div>
    </Sheet>
  )
}
