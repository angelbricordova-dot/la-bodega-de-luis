import { createPortal } from 'react-dom'
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { create } from 'zustand'
import JsBarcode from 'jsbarcode'
import { Check, Minus, Plus, X } from 'lucide-react'
import type { Category, Product } from '../db'
import { barcodeFormat } from '../lib/barcode'
import { toBs, usd } from '../lib/money'
import { useSettings } from '../lib/hooks'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ---------- Botones ---------- */

type BtnVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'soft' | 'dark'

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' && 'h-9 px-3 text-sm rounded-xl',
        size === 'md' && 'h-11 px-4 text-[15px]',
        size === 'lg' && 'h-14 px-5 text-base',
        variant === 'primary' && 'bg-brand-500 text-white shadow-[0_6px_16px_-6px_rgba(47,158,110,.7)] hover:bg-brand-600',
        variant === 'outline' && 'border border-line bg-surface text-ink hover:bg-canvas',
        variant === 'ghost' && 'text-ink hover:bg-black/5',
        variant === 'danger' && 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100',
        variant === 'soft' && 'bg-brand-50 text-brand-700 hover:bg-brand-100',
        variant === 'dark' && 'bg-ink text-white hover:bg-black',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function IconButton({ className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cx('grid place-items-center size-10 rounded-xl text-muted hover:bg-black/5 active:scale-95 transition', className)}
    >
      {children}
    </button>
  )
}

/* ---------- Formularios ---------- */

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-[13px] font-semibold text-muted mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  )
}

export function Input({ className, icon, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  return (
    <div className={cx('relative', className)}>
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{icon}</span>}
      <input
        {...rest}
        className={cx(
          'w-full h-12 rounded-2xl bg-canvas border border-line px-3.5 outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100 transition placeholder:text-muted/60',
          icon ? 'pl-10' : '',
        )}
      />
    </div>
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        'w-full min-h-20 rounded-2xl bg-canvas border border-line p-3.5 outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100 transition placeholder:text-muted/60',
        props.className,
      )}
    />
  )
}

export function Chip({ active, children, onClick, className, color }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={active && color ? { background: color, borderColor: color } : undefined}
      className={cx(
        'h-9 px-3.5 rounded-full text-sm font-semibold whitespace-nowrap border transition active:scale-95 shrink-0',
        active ? 'bg-brand-500 border-brand-500 text-white' : 'bg-surface border-line text-ink/80',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex p-1 rounded-2xl bg-canvas border border-line">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 h-9 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5',
            value === o.value ? 'bg-white shadow-sm text-brand-700' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, min = 0, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-surface">
      <button className="size-8 grid place-items-center text-muted active:scale-90" onClick={() => onChange(Math.max(min, +(value - step).toFixed(3)))} aria-label="Menos">
        <Minus size={16} />
      </button>
      <span className="min-w-7 text-center text-sm font-bold tabular">{+value.toFixed(3)}</span>
      <button className="size-8 grid place-items-center text-brand-600 active:scale-90" onClick={() => onChange(+(value + step).toFixed(3))} aria-label="Más">
        <Plus size={16} />
      </button>
    </div>
  )
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx('bg-surface rounded-3xl border border-line', onClick && 'active:scale-[.99] transition cursor-pointer', className)}>
      {children}
    </div>
  )
}

export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'red' | 'amber' | 'gray' | 'purple' | 'indigo' }) {
  const tones = {
    green: 'bg-brand-50 text-brand-700',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-canvas text-muted',
    purple: 'bg-fuchsia-50 text-fuchsia-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  }
  return <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold', tones[tone])}>{children}</span>
}

export function Empty({ icon, title, text, children }: { icon: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <div className="size-16 rounded-full bg-brand-50 text-brand-400 grid place-items-center mb-3">{icon}</div>
      <p className="font-bold text-lg">{title}</p>
      {text && <p className="text-muted text-sm mt-1 max-w-64">{text}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

/* ---------- Hoja inferior (modal) ---------- */

export function Sheet({ open, onClose, title, children, footer, tall }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; tall?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade" onClick={onClose} />
      <div className={cx('relative w-full max-w-lg bg-surface rounded-t-[28px] animate-sheet flex flex-col pb-safe', tall ? 'h-[92dvh]' : 'max-h-[92dvh]')}>
        <div className="pt-2.5 pb-1 grid place-items-center">
          <div className="w-10 h-1.5 rounded-full bg-line" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 pb-2">
            <h2 className="text-lg font-bold">{title}</h2>
            <IconButton onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </IconButton>
          </div>
        )}
        <div className="overflow-y-auto px-5 pb-4 flex-1">{children}</div>
        {footer && <div className="px-5 pt-3 pb-4 border-t border-line">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* ---------- Toasts y confirmaciones ---------- */

interface ToastItem {
  id: number
  text: string
  sub?: string
  tone: 'ok' | 'error' | 'info'
}

const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }))

export function toast(text: string, opts: { sub?: string; tone?: ToastItem['tone'] } = {}) {
  const id = Date.now() + Math.random()
  useToasts.setState({ items: [{ id, text, sub: opts.sub, tone: opts.tone ?? 'ok' }] })
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((i) => i.id !== id) })), opts.tone === 'error' ? 3200 : 1800)
}

export function Toaster() {
  const items = useToasts((s) => s.items)
  return (
    <div className="fixed left-0 right-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
      {items.map((t) => (
        <div
          key={t.id}
          className={cx(
            'animate-toast w-full max-w-md rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-lg text-white text-[15px]',
            t.tone === 'ok' && 'bg-brand-500',
            t.tone === 'error' && 'bg-red-500',
            t.tone === 'info' && 'bg-ink',
          )}
        >
          {t.tone === 'ok' && <Check size={20} className="shrink-0" />}
          <span className="font-semibold flex-1">{t.text}</span>
          {t.sub && <span className="font-bold tabular">{t.sub}</span>}
        </div>
      ))}
    </div>
  )
}

interface ConfirmState {
  open: boolean
  title: string
  text?: string
  ok: string
  danger?: boolean
  resolve?: (v: boolean) => void
}
const useConfirm = create<ConfirmState>(() => ({ open: false, title: '', ok: 'Aceptar' }))

export function confirmDialog(title: string, opts: { text?: string; ok?: string; danger?: boolean } = {}) {
  return new Promise<boolean>((resolve) => {
    useConfirm.setState({ open: true, title, text: opts.text, ok: opts.ok ?? 'Aceptar', danger: opts.danger, resolve })
  })
}

export function ConfirmHost() {
  const s = useConfirm()
  const close = (v: boolean) => {
    s.resolve?.(v)
    useConfirm.setState({ open: false, resolve: undefined })
  }
  return (
    <Sheet open={s.open} onClose={() => close(false)}>
      <div className="pt-2">
        <p className="text-lg font-bold">{s.title}</p>
        {s.text && <p className="text-muted mt-1">{s.text}</p>}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button variant="outline" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button variant={s.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
            {s.ok}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

/* ---------- Productos ---------- */

export function ProductThumb({ product, category, className }: { product: Pick<Product, 'image' | 'name'>; category?: Category; className?: string }) {
  if (product.image) return <img src={product.image} alt="" className={cx('object-cover bg-white', className)} />
  return (
    <div className={cx('grid place-items-center bg-gradient-to-br from-brand-50 to-canvas', className)}>
      <span className="text-[2em] leading-none">{category?.emoji ?? '📦'}</span>
    </div>
  )
}

export function Price({ value, className, bsClass }: { value: number; className?: string; bsClass?: string }) {
  const s = useSettings()
  return (
    <span className={cx('inline-flex flex-col leading-tight', className)}>
      <span className="font-bold tabular">{usd(value)}</span>
      {s.showBs && <span className={cx('text-[11px] text-muted tabular', bsClass)}>{toBs(value, s.rate)}</span>}
    </span>
  )
}

export function BarcodeSvg({ code, height = 44, className }: { code: string; height?: number; className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current || !code) return
    try {
      JsBarcode(ref.current, code, { format: barcodeFormat(code), height, fontSize: 13, margin: 0, width: 1.7, background: 'transparent' })
    } catch {
      JsBarcode(ref.current, code, { format: 'CODE128', height, fontSize: 13, margin: 0, width: 1.5, background: 'transparent' })
    }
  }, [code, height])
  return <svg ref={ref} className={className} />
}
