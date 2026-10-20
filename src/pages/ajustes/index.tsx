import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, LogOut, Briefcase, CreditCard, FolderTree, HardDrive, Headphones, LineChart, Printer, Settings, ShieldCheck, ShoppingBasket, UserCog, Users, Vault } from 'lucide-react'
import { Page, PageHeader } from '../../components/Layout'
import { Button, Card, Input, confirmDialog } from '../../components/ui'
import { useSettings } from '../../lib/hooks'
import Negocio from './Negocio'
import Pagos from './Pagos'
import Impresion from './Impresion'
import Clientes from './Clientes'
import Vendedores from './Vendedores'
import Categorias from './Categorias'
import Compras from './Compras'
import Finanzas from './Finanzas'
import Caja from './Caja'
import Avanzado from './Avanzado'
import Admin from './Admin'
import Soporte from './Soporte'
import MiPlan from './MiPlan'
import { cloudEnabled, emailToLogin } from '../../lib/cloud'
import { backToAdmin, signOutSafely, useAccount } from '../../lib/account'

const SECTIONS: { key: string; label: string; icon: typeof Settings; color: string; el: () => ReactNode; protect?: boolean }[] = [
  ...(cloudEnabled ? [{ key: 'plan', label: 'Mi plan', icon: BadgeCheck, color: '#2f9e6e', el: () => <MiPlan /> }] : []),
  { key: 'negocio', label: 'Negocio', icon: Briefcase, color: '#2f9e6e', el: () => <Negocio /> },
  { key: 'pagos', label: 'Pagos y tasa', icon: CreditCard, color: '#7c3aed', el: () => <Pagos /> },
  { key: 'impresion', label: 'Impresión', icon: Printer, color: '#db2777', el: () => <Impresion /> },
  { key: 'clientes', label: 'Clientes', icon: Users, color: '#16a34a', el: () => <Clientes /> },
  { key: 'vendedores', label: 'Vendedores', icon: UserCog, color: '#0d9488', el: () => <Vendedores /> },
  { key: 'categorias', label: 'Categorías', icon: FolderTree, color: '#ea580c', el: () => <Categorias /> },
  { key: 'compras', label: 'Compras', icon: ShoppingBasket, color: '#9333ea', el: () => <Compras />, protect: true },
  { key: 'finanzas', label: 'Finanzas', icon: LineChart, color: '#059669', el: () => <Finanzas />, protect: true },
  { key: 'soporte', label: 'Soporte', icon: Headphones, color: '#0891b2', el: () => <Soporte /> },
  { key: 'caja', label: 'Historial caja', icon: Vault, color: '#15803d', el: () => <Caja /> },
  { key: 'avanzado', label: 'Respaldo', icon: HardDrive, color: '#64748b', el: () => <Avanzado />, protect: true },
  { key: 'admin', label: 'Admin', icon: ShieldCheck, color: '#d97706', el: () => <Admin />, protect: true },
]

let unlocked = false

function Gate({ children }: { children: ReactNode }) {
  const s = useSettings()
  const [pin, setPin] = useState('')
  const [ok, setOk] = useState(unlocked)
  if (!s.adminPin || ok) return <>{children}</>
  return (
    <div className="max-w-xs mx-auto text-center pt-10">
      <div className="size-16 rounded-full bg-amber-50 text-amber-600 grid place-items-center mx-auto mb-3">
        <ShieldCheck size={28} />
      </div>
      <p className="font-bold text-lg">Sección protegida</p>
      <p className="text-sm text-muted mb-4">Ingresa el PIN de administrador</p>
      <Input type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} className="mb-3" />
      <Button
        className="w-full"
        onClick={() => {
          if (pin === s.adminPin) {
            unlocked = true
            setOk(true)
          } else setPin('')
        }}
      >
        Entrar
      </Button>
    </div>
  )
}

export default function Ajustes() {
  const { section } = useParams()
  const nav = useNavigate()
  const current = SECTIONS.find((x) => x.key === section)
  if (current) {
    return (
      <>
        <PageHeader title={current.label} back />
        <main className="max-w-lg mx-auto px-4 pb-28">{current.protect ? <Gate>{current.el()}</Gate> : current.el()}</main>
      </>
    )
  }
  return (
    <>
      <PageHeader title="Ajustes" icon={<Settings size={20} />} />
      <Page>
        <div className="grid grid-cols-3 gap-2.5">
          {SECTIONS.map(({ key, label, icon: Icon, color }) => (
            <button key={key} onClick={() => nav(`/ajustes/${key}`)} className="aspect-square rounded-3xl bg-surface border border-line flex flex-col items-center justify-center gap-2 active:scale-95 transition p-2">
              <span className="size-11 rounded-2xl grid place-items-center" style={{ background: color + '18', color }}>
                <Icon size={21} />
              </span>
              <span className="text-[12.5px] font-semibold text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
        <SessionCard />
        <p className="text-center text-xs text-muted mt-6">TuBodega · v1.1 · Tus datos se guardan en este teléfono</p>
      </Page>
    </>
  )
}

/** Quién está conectado en este teléfono y el botón para salir */
function SessionCard() {
  const { account, license } = useAccount()
  if (!cloudEnabled || !account || account.mode === 'admin') return null
  const isDemoAdmin = account.mode === 'demo' && account.isAdmin
  const who = account.mode === 'store' ? emailToLogin(account.email) : 'Modo demostración'
  const where = account.mode === 'store' ? license?.store?.name : 'Datos de ejemplo'
  return (
    <Card className="mt-5 p-4">
      <div className="flex items-center gap-3">
        <span className="size-11 rounded-full bg-brand-50 text-brand-700 font-extrabold grid place-items-center uppercase">{who[0]}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{who}</p>
          <p className="text-xs text-muted truncate">
            {where}
            {account.mode === 'store' && license?.role === 'seller' ? ' · Vendedor' : account.mode === 'store' ? ' · Dueño' : ''}
          </p>
        </div>
      </div>
      <div className={`grid gap-2.5 mt-3 ${isDemoAdmin ? 'grid-cols-2' : ''}`}>
        {isDemoAdmin && (
          <Button variant="soft" onClick={backToAdmin}>
            Volver al panel
          </Button>
        )}
        <Button
          variant="danger"
          onClick={async () => {
            const ok = await confirmDialog('¿Cerrar sesión en este teléfono?', {
              text: account.mode === 'store' ? 'Tus datos quedan guardados en el teléfono y en la nube. Para volver a entrar necesitas tu usuario y clave.' : undefined,
              ok: 'Cerrar sesión',
              danger: true,
            })
            if (ok) signOutSafely()
          }}
        >
          <LogOut size={17} /> Cerrar sesión
        </Button>
      </div>
    </Card>
  )
}
