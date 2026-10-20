import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, ArrowLeft, Bell, CalendarClock, LayoutGrid, Package, Receipt, ScanBarcode, Settings, Users } from 'lucide-react'
import { db } from '../db'
import { useOpenCash, useSettings } from '../lib/hooks'
import { usd } from '../lib/money'
import { cx, IconButton, Sheet } from './ui'
import { CashSheet } from './CashSheet'
import { SyncBadge } from './CloudSync'

export function PageHeader({ title, icon, back, right }: { title: string; icon?: ReactNode; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate()
  const cash = useOpenCash()
  const s = useSettings()
  const [cashOpen, setCashOpen] = useState(false)
  if (back) {
    return (
      <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur pt-safe">
        <div className="h-14 px-2 flex items-center gap-1 max-w-lg mx-auto">
          <IconButton onClick={() => nav(-1)} aria-label="Volver">
            <ArrowLeft size={22} className="text-ink" />
          </IconButton>
          <h1 className="flex-1 text-center font-bold text-[17px] -ml-10 pointer-events-none">{title}</h1>
          <div className="min-w-10 flex justify-end">{right}</div>
        </div>
      </header>
    )
  }
  return (
    <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur pt-safe">
      <div className="h-16 px-4 flex items-center gap-3 max-w-lg mx-auto">
        <div className="size-10 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center">{icon}</div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[17px] leading-tight truncate">{title}</h1>
          <div className="flex items-center gap-1.5 min-w-0">
          <button onClick={() => setCashOpen(true)} className="flex items-center gap-1.5 shrink-0">
            <span
              className={cx(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide',
                cash ? 'bg-brand-50 text-brand-600' : 'bg-red-50 text-red-500',
              )}
            >
              <span className={cx('size-1.5 rounded-full', cash ? 'bg-brand-500' : 'bg-red-500')} />
              {cash ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
            </span>
            <span className="text-[10px] font-semibold text-muted tabular">Tasa {s.rate.toFixed(2)}</span>
          </button>
          <SyncBadge />
          </div>
        </div>
        {right}
        <Notifications />
      </div>
      <CashSheet open={cashOpen} onClose={() => setCashOpen(false)} />
    </header>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const data = useLiveQuery(async () => {
    const products = await db.products.toArray()
    const soon = Date.now() + 7 * 864e5
    const fiados = (await db.sales.where('status').equals('fiada').toArray()).filter((x) => x.balance > 0)
    return {
      out: products.filter((p) => p.stock <= 0),
      low: products.filter((p) => p.stock > 0 && p.stock <= p.minStock),
      expiring: products.filter((p) => p.expiry && new Date(p.expiry).getTime() <= soon),
      debt: fiados.reduce((a, x) => a + x.balance, 0),
      debtors: new Set(fiados.map((x) => x.customerId)).size,
    }
  }, [])
  const count = data ? data.out.length + data.low.length + data.expiring.length + (data.debt > 0 ? 1 : 0) : 0
  const go = (to: string) => {
    setOpen(false)
    nav(to)
  }
  return (
    <>
      <IconButton onClick={() => setOpen(true)} className="relative" aria-label="Avisos">
        <Bell size={21} className="text-ink/70" />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">{count}</span>
        )}
      </IconButton>
      <Sheet open={open} onClose={() => setOpen(false)} title="Avisos">
        {data && (
          <div className="space-y-2.5">
            {count === 0 && <p className="text-muted py-6 text-center">Todo en orden. No hay avisos.</p>}
            {data.out.length > 0 && (
              <Notice tone="red" icon={<AlertTriangle size={18} />} title={`${data.out.length} productos agotados`} text={data.out.map((p) => p.name).join(', ')} onClick={() => go('/inventario?f=agotados')} />
            )}
            {data.low.length > 0 && (
              <Notice tone="amber" icon={<Package size={18} />} title={`${data.low.length} con stock bajo`} text={data.low.map((p) => p.name).join(', ')} onClick={() => go('/inventario?f=bajo')} />
            )}
            {data.expiring.length > 0 && (
              <Notice tone="amber" icon={<CalendarClock size={18} />} title={`${data.expiring.length} por vencer (7 días)`} text={data.expiring.map((p) => `${p.name} (${p.expiry})`).join(', ')} onClick={() => go('/inventario')} />
            )}
            {data.debt > 0 && (
              <Notice tone="purple" icon={<Users size={18} />} title={`${usd(data.debt)} por cobrar en fiados`} text={`${data.debtors} clientes deben`} onClick={() => go('/historial?tab=fiados')} />
            )}
          </div>
        )}
      </Sheet>
    </>
  )
}

function Notice({ tone, icon, title, text, onClick }: { tone: 'red' | 'amber' | 'purple'; icon: ReactNode; title: string; text: string; onClick: () => void }) {
  const t = { red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-700', purple: 'bg-fuchsia-50 text-fuchsia-700' }[tone]
  return (
    <button onClick={onClick} className="w-full text-left flex gap-3 p-3.5 rounded-2xl border border-line active:scale-[.99]">
      <span className={cx('size-9 rounded-xl grid place-items-center shrink-0', t)}>{icon}</span>
      <span className="min-w-0">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-muted line-clamp-2">{text}</span>
      </span>
    </button>
  )
}

const NAV = [
  { to: '/', label: 'Venta', icon: ScanBarcode },
  { to: '/catalogo', label: 'Catálogo', icon: LayoutGrid },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/historial', label: 'Historial', icon: Receipt },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line pb-safe">
      <div className="max-w-lg mx-auto grid grid-cols-5 h-16">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className="flex flex-col items-center justify-center gap-0.5">
            {({ isActive }) => (
              <>
                <span className={cx('h-8 w-14 rounded-full grid place-items-center transition', isActive ? 'bg-brand-100 text-brand-700' : 'text-muted')}>
                  <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className={cx('text-[11px] font-semibold', isActive ? 'text-brand-700' : 'text-muted')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cx('max-w-lg mx-auto px-4 pb-28', className)}>{children}</main>
}
