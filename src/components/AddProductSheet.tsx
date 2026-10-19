import { useEffect, useState } from 'react'
import { create } from 'zustand'
import type { Product } from '../db'
import { useCart } from '../store/cart'
import { useSettings } from '../lib/hooks'
import { parseNum, round2, stockFmt, toBs, usd } from '../lib/money'
import { Button, Chip, Field, Input, Segmented, Sheet, Stepper, toast } from './ui'

const usePicker = create<{ product: Product | null }>(() => ({ product: null }))

/** Agrega un producto al carrito; si se vende por peso o por presentación, pregunta primero */
export function pickProduct(p: Product) {
  if (p.unit !== 'unidad' || p.presentations.length > 0) {
    usePicker.setState({ product: p })
    return
  }
  useCart.getState().addProduct(p)
  toast(`${p.name} agregado`, { sub: usd(p.price) })
}

export function PickerHost() {
  const product = usePicker((s) => s.product)
  const close = () => usePicker.setState({ product: null })
  if (!product) return null
  return product.unit === 'unidad' ? <PresentationSheet product={product} onClose={close} /> : <WeightSheet product={product} onClose={close} />
}

function PresentationSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const s = useSettings()
  const options = [{ name: 'Unidad', qty: 1, price: product.price }, ...product.presentations]
  const [sel, setSel] = useState(0)
  const [qty, setQty] = useState(1)
  const opt = options[sel]
  const total = round2(opt.price * qty)
  const need = opt.qty * qty
  const add = () => {
    useCart.getState().addProduct(product, { qty, factor: opt.qty, unitLabel: sel === 0 ? 'c/u' : opt.name, unitPrice: opt.price })
    toast(`${product.name} agregado`, { sub: usd(total) })
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={product.name}>
      <p className="text-sm text-muted -mt-1 mb-3">Elige cómo venderlo</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o, i) => (
          <Chip key={o.name} active={sel === i} onClick={() => setSel(i)}>
            {o.name}
          </Chip>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-canvas p-4 flex justify-between items-center">
        <div>
          <p className="text-xs font-semibold text-muted">Disponibles</p>
          <p className="font-bold tabular">{stockFmt(product.stock, 'unidad')}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-muted">Precio {opt.name.toLowerCase()}</p>
          <p className="font-bold tabular">{usd(opt.price)}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-semibold">Cantidad</span>
        <Stepper value={qty} min={1} onChange={setQty} />
      </div>
      {need > product.stock && <p className="mt-3 text-sm font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2">Ojo: solo hay {product.stock} en inventario.</p>}
      <Button size="lg" className="w-full mt-5" onClick={add}>
        Agregar — {usd(total)}
        {s.showBs && <span className="font-medium opacity-80 text-sm">({toBs(total, s.rate)})</span>}
      </Button>
    </Sheet>
  )
}

function WeightSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const s = useSettings()
  const isKg = product.unit === 'kg'
  const [mode, setMode] = useState<'peso' | 'monto'>('peso')
  const [sub, setSub] = useState<'kg' | 'g'>(isKg ? 'g' : 'kg')
  const [value, setValue] = useState('')
  useEffect(() => setValue(''), [mode, sub])

  let qty = 0
  if (mode === 'monto') qty = product.price > 0 ? parseNum(value) / product.price : 0
  else qty = isKg && sub === 'g' ? parseNum(value) / 1000 : parseNum(value)
  qty = Math.round(qty * 1000) / 1000
  const total = mode === 'monto' ? round2(parseNum(value)) : round2(qty * product.price)
  const quick = isKg
    ? [
        { l: '100 g', q: 0.1 },
        { l: '250 g', q: 0.25 },
        { l: '500 g', q: 0.5 },
        { l: '1 kg', q: 1 },
      ]
    : [
        { l: '1 m', q: 1 },
        { l: '2 m', q: 2 },
        { l: '5 m', q: 5 },
        { l: '10 m', q: 10 },
      ]
  const add = () => {
    if (qty <= 0) return
    useCart.getState().addProduct(product, { qty, factor: 1, unitLabel: product.unit, unitPrice: product.price })
    toast(`${product.name} agregado`, { sub: usd(total) })
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={product.name}>
      <div className="rounded-2xl bg-canvas p-4 flex justify-between">
        <div>
          <p className="text-xs font-semibold text-muted">Stock disponible</p>
          <p className="font-bold tabular">{stockFmt(product.stock, product.unit)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-muted">Precio</p>
          <p className="font-bold tabular">
            {usd(product.price)}/{product.unit}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'peso', label: isKg ? 'Por peso' : 'Por metros' },
            { value: 'monto', label: 'Por monto ($)' },
          ]}
        />
      </div>
      {mode === 'peso' && (
        <>
          <p className="text-[13px] font-semibold text-muted mt-4 mb-2">{isKg ? 'Peso rápido' : 'Medida rápida'}</p>
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => (
              <Chip key={q.l} active={Math.abs(qty - q.q) < 1e-6} onClick={() => setValue(String(isKg && sub === 'g' ? q.q * 1000 : q.q))}>
                {q.l}
              </Chip>
            ))}
          </div>
        </>
      )}
      <div className="flex gap-2 mt-4 items-end">
        <Field label={mode === 'monto' ? 'Monto en $' : isKg ? `Cantidad (${sub})` : 'Metros'} className="flex-1">
          <Input autoFocus inputMode="decimal" placeholder="0" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        {mode === 'peso' && isKg && (
          <div className="w-28">
            <Segmented value={sub} onChange={setSub} options={[{ value: 'kg', label: 'kg' }, { value: 'g', label: 'g' }]} />
          </div>
        )}
      </div>
      <div className="mt-4 rounded-2xl border border-line p-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-muted">Total</p>
          {mode === 'monto' && qty > 0 && <p className="text-xs text-muted">≈ {isKg ? (qty < 1 ? `${Math.round(qty * 1000)} g` : `${qty} kg`) : `${qty} m`}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold tabular">{usd(total)}</p>
          {s.showBs && <p className="text-xs text-muted tabular">{toBs(total, s.rate)}</p>}
        </div>
      </div>
      {qty > product.stock && <p className="mt-3 text-sm font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2">Ojo: supera el stock disponible.</p>}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={add} disabled={qty <= 0}>
          Agregar
        </Button>
      </div>
    </Sheet>
  )
}

export function VentaLibreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [cur, setCur] = useState<'usd' | 'bs'>('usd')
  const [qty, setQty] = useState(1)
  const priceUsd = cur === 'usd' ? parseNum(price) : parseNum(price) / s.rate
  const add = () => {
    if (priceUsd <= 0) return
    useCart.getState().addFree(name.trim(), round2(priceUsd), qty)
    toast(`${name.trim() || 'Venta libre'} agregado`, { sub: usd(priceUsd * qty) })
    setName('')
    setPrice('')
    setQty(1)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="⚡ Venta libre">
      <p className="text-sm text-muted -mt-1 mb-4">Para cobrar algo que no está en el inventario.</p>
      <div className="space-y-4">
        <Field label="Descripción (opcional)">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Recarga, chuchería suelta…" />
        </Field>
        <div className="flex gap-2 items-end">
          <Field label="Precio" className="flex-1">
            <Input autoFocus inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </Field>
          <div className="w-28">
            <Segmented value={cur} onChange={setCur} options={[{ value: 'usd', label: '$' }, { value: 'bs', label: 'Bs' }]} />
          </div>
        </div>
        {cur === 'bs' && priceUsd > 0 && <p className="text-sm text-muted">Equivale a {usd(priceUsd)}</p>}
        <div className="flex items-center justify-between">
          <span className="font-semibold">Cantidad</span>
          <Stepper value={qty} min={1} onChange={setQty} />
        </div>
        <Button size="lg" className="w-full" onClick={add} disabled={priceUsd <= 0}>
          Agregar — {usd(priceUsd * qty)}
        </Button>
      </div>
    </Sheet>
  )
}
