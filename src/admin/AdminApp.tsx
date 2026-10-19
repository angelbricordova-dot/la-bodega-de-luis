import { useEffect, type ReactNode } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Clock, CreditCard, DollarSign, LayoutDashboard, Plus, Settings, Store, Users, WifiOff } from 'lucide-react'
import { Logo } from '../components/AuthScreen'
import { Badge, Card, ConfirmHost, Toaster, cx } from '../components/ui'
import { signOut } from '../lib/account'
import { supabase } from '../lib/cloud'
import { usd } from '../lib/money'
import { Bodegas, BodegaDetalle } from './Bodegas'
import { Pagos } from './Pagos'
import { AdminAjustes } from './AdminAjustes'
import { MODE_LABEL, MODE_TONE, daysSince, fetchPayments, fetchStores, storeMode, useLoad } from './data'

export function AdminPage({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur pt-safe">
        <div className="h-16 px-4 flex items-center gap-3 max-w-2xl mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold tracking-wider text-brand-600">TUBODEGA · ADMIN</p>
            <h1 className="font-bold text-lg leading-tight truncate">{title}</h1>
          </div>
          {right}
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 pb-28">{children}</main>
    </>
  )
}

const NAV = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard },
  { to: '/admin/bodegas', label: 'Bodegas', icon: Store },
  { to: '/admin/pagos', label: 'Pagos', icon: CreditCard },
  { to: '/admin/ajustes', label: 'Ajustes', icon: Settings },
]

function AdminNav({ pending }: { pending: number }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line pb-safe">
      <div className="max-w-2xl mx-auto grid grid-cols-4 h-16">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/admin'} className="flex flex-col items-center justify-center gap-0.5 relative">
            {({ isActive }) => (
              <>
                <span className={cx('h-8 w-14 rounded-full grid place-items-center', isActive ? 'bg-brand-100 text-brand-700' : 'text-muted')}>
                  <Icon size={21} />
                </span>
                <span className={cx('text-[11px] font-semibold', isActive ? 'text-brand-700' : 'text-muted')}>{label}</span>
                {to === '/admin/pagos' && pending > 0 && (
                  <span className="absolute top-1.5 left-1/2 ml-3 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">{pending}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function AdminApp() {
  const pending = useLoad(() => fetchPayments({ status: 'pendiente' }), [])

  // Si la sesión ya no es de un admin, volver a la pantalla de entrada
  useEffect(() => {
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (!error && data === false) signOut()
    })
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) signOut()
    })
  }, [])

  return (
    <>
      <Routes>
        <Route path="/admin" element={<Resumen pendingCount={pending.data?.length ?? 0} />} />
        <Route path="/admin/bodegas" element={<Bodegas />} />
        <Route path="/admin/bodegas/:id" element={<BodegaDetalle onChange={pending.reload} />} />
        <Route path="/admin/pagos" element={<Pagos onChange={pending.reload} />} />
        <Route path="/admin/ajustes" element={<AdminAjustes />} />
        <Route path="*" element={<Resumen pendingCount={pending.data?.length ?? 0} />} />
      </Routes>
      <AdminNav pending={pending.data?.length ?? 0} />
      <ConfirmHost />
      <Toaster />
    </>
  )
}

function Resumen({ pendingCount }: { pendingCount: number }) {
  const nav = useNavigate()
  const { data: stores, error } = useLoad(fetchStores, [])
  const list = stores ?? []
  const withMode = list.map((s) => ({ s, l: storeMode(s) }))
  const paying = withMode.filter(({ s, l }) => s.status === 'active' && ['activa', 'aviso', 'gracia'].includes(l.mode))
  const mrr = paying.reduce((a, { s }) => a + Number(s.monthly_price), 0)
  const trial = withMode.filter(({ l }) => l.mode === 'prueba')
  const dueSoon = withMode.filter(({ l }) => l.mode === 'aviso' || l.mode === 'gracia')
  const overdue = withMode.filter(({ l }) => l.mode === 'vencida')
  const flagged = new Set([...dueSoon, ...overdue].map(({ s }) => s.id))
  const inactive = withMode.filter(({ s, l }) => !flagged.has(s.id) && l.canSell && (daysSince(s.last_seen_at) ?? 99) >= 3)
  const salesMonth = list.reduce((a, s) => a + (s.stats?.total_mes ?? 0), 0)

  return (
    <AdminPage title="Resumen" right={<Logo className="scale-75 origin-right" />}>
      {error && <p className="text-red-600 text-sm mb-3">No se pudo cargar: {error}</p>}
      <div className="rounded-3xl p-5 text-white bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_14px_30px_-14px_rgba(47,158,110,.9)]">
        <p className="text-xs text-white/80 font-semibold">Ingreso mensual</p>
        <p className="text-4xl font-extrabold tabular">{usd(mrr)}</p>
        <p className="text-sm text-white/80">
          {paying.length} bodegas pagando · meta 20 bodegas
        </p>
        <div className="h-2 rounded-full bg-white/20 mt-3 overflow-hidden">
          <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, (paying.length / 20) * 100)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-3">
        <Kpi icon={<Users size={16} />} label="En prueba" value={trial.length} onClick={() => nav('/admin/bodegas?f=prueba')} />
        <Kpi icon={<DollarSign size={16} />} label="Pagos por revisar" value={pendingCount} tone={pendingCount ? 'amber' : undefined} onClick={() => nav('/admin/pagos')} />
        <Kpi icon={<Clock size={16} />} label="Por vencer" value={dueSoon.length} tone={dueSoon.length ? 'amber' : undefined} onClick={() => nav('/admin/bodegas?f=aviso')} />
        <Kpi icon={<AlertTriangle size={16} />} label="Vencidas" value={overdue.length} tone={overdue.length ? 'red' : undefined} onClick={() => nav('/admin/bodegas?f=vencida')} />
      </div>

      <Card className="p-4 mt-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted font-semibold">Vendido este mes en todas tus bodegas</p>
          <p className="text-xl font-extrabold tabular">{usd(salesMonth)}</p>
        </div>
        <button onClick={() => nav('/admin/bodegas?nueva=1')} className="h-11 px-4 rounded-2xl bg-brand-500 text-white font-semibold flex items-center gap-1.5">
          <Plus size={18} /> Nueva bodega
        </button>
      </Card>

      <h2 className="font-bold mt-6 mb-2">Requieren atención</h2>
      <div className="space-y-2">
        {[...overdue, ...dueSoon].map(({ s, l }) => (
          <Attention key={s.id} title={s.name} text={l.message} badge={<Badge tone={MODE_TONE[l.mode]}>{MODE_LABEL[l.mode]}</Badge>} onClick={() => nav(`/admin/bodegas/${s.id}`)} />
        ))}
        {inactive.map(({ s }) => (
          <Attention
            key={s.id + 'i'}
            title={s.name}
            text={s.last_seen_at ? `Sin abrir la app hace ${daysSince(s.last_seen_at)} días. Llámalo antes de que se enfríe.` : 'Todavía no ha abierto la app.'}
            badge={<WifiOff size={16} className="text-muted" />}
            onClick={() => nav(`/admin/bodegas/${s.id}`)}
          />
        ))}
        {!overdue.length && !dueSoon.length && !inactive.length && <p className="text-sm text-muted">Todo en orden.</p>}
      </div>
    </AdminPage>
  )
}

function Kpi({ icon, label, value, tone, onClick }: { icon: ReactNode; label: string; value: number; tone?: 'amber' | 'red'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'text-left rounded-2xl border p-3.5 active:scale-[.98] transition',
        tone === 'red' ? 'bg-red-50 border-red-100' : tone === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-surface border-line',
      )}
    >
      <p className={cx('text-xs font-semibold flex items-center gap-1.5', tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-700' : 'text-muted')}>
        {icon} {label}
      </p>
      <p className="text-2xl font-extrabold tabular mt-1">{value}</p>
    </button>
  )
}

function Attention({ title, text, badge, onClick }: { title: string; text: string; badge: ReactNode; onClick: () => void }) {
  return (
    <Card className="p-3.5 flex items-center gap-3" onClick={onClick}>
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate">{title}</p>
        <p className="text-xs text-muted">{text}</p>
      </div>
      {badge}
      <ArrowRight size={16} className="text-muted" />
    </Card>
  )
}
