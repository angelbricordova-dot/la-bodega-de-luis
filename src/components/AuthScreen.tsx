import { useEffect, useState } from 'react'
import { KeyRound, LogIn, Store } from 'lucide-react'
import { activate, refreshLicense, setAccount, signIn } from '../lib/account'
import { BUILD, friendlyError, supabase } from '../lib/cloud'
import { Button, Field, Input, Segmented } from './ui'
import { StorageNotice } from '../public/PublicShell'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src="/icon-192.png" alt="" className="size-11 rounded-2xl shadow-[0_8px_20px_-8px_rgba(47,158,110,.8)]" />
      <span className="text-2xl font-extrabold tracking-tight">
        Tu<span className="text-brand-500">Bodega</span>
      </span>
    </div>
  )
}

/** Primera pantalla cuando el teléfono no tiene cuenta abierta */
export default function AuthScreen() {
  const [tab, setTab] = useState<'entrar' | 'activar'>(() => (new URLSearchParams(location.search).get('codigo') ? 'activar' : 'entrar'))
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('codigo') ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsCode, setNeedsCode] = useState(false)
  const [agree, setAgree] = useState(false)

  const go = (to: string) => location.replace(to)

  // Si ya hay sesión (por ejemplo se borró el caché), retomarla
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      try {
        const lic = await refreshLicense()
        const u = data.session.user
        if (lic.store) {
          setAccount({ mode: 'store', storeId: lic.store.id, userId: u.id, email: u.email ?? '', sessionRev: lic.sessionRev ?? 0 })
          go('/')
        } else if (lic.isAdmin) {
          setAccount({ mode: 'admin', userId: u.id, email: u.email ?? '' })
          go('/admin')
        } else setNeedsCode(true)
      } catch {
        /* sin internet */
      }
    })
  }, [])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const onEnter = () =>
    run(async () => {
      const { account } = await signIn(login, password)
      if (!account) setNeedsCode(true)
      else go(account.mode === 'admin' ? '/admin' : '/')
    })

  const onActivate = () =>
    run(async () => {
      if (!needsCode) {
        if (login.trim().length < 3) throw new Error('El usuario debe tener al menos 3 letras.')
        if (password.length < 6) throw new Error('La clave debe tener al menos 6 caracteres.')
        if (password !== password2) throw new Error('Las claves no coinciden.')
      }
      if (!agree) throw new Error('Para activar, acepta los Términos y la Política de privacidad.')
      const acc = await activate(code, login, password)
      if (acc) go('/')
    })

  return (
    <div className="min-h-dvh flex flex-col max-w-sm mx-auto px-6 pt-safe">
      <div className="flex-1 flex flex-col justify-center py-10">
        <Logo className="justify-center mb-2" />
        <p className="text-center text-muted mb-8">Ventas, inventario y fiados de tu bodega en el teléfono.</p>

        {needsCode ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 text-amber-800 p-4 text-sm">Tu usuario todavía no tiene una bodega. Escribe el código de activación que te dieron.</div>
            <Field label="Código de activación">
              <Input icon={<KeyRound size={18} />} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} className="tracking-widest" />
            </Field>
            <TermsCheck checked={agree} onChange={setAgree} />
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            <Button size="lg" className="w-full" disabled={busy || code.length < 6 || !agree} onClick={onActivate}>
              Activar mi bodega
            </Button>
          </div>
        ) : (
          <>
            <Segmented
              value={tab}
              onChange={(t) => {
                setTab(t)
                setError('')
              }}
              options={[
                { value: 'entrar', label: <><LogIn size={15} /> Entrar</> },
                { value: 'activar', label: <><Store size={15} /> Activar bodega</> },
              ]}
            />
            <form
              className="space-y-4 mt-5"
              onSubmit={(e) => {
                e.preventDefault()
                if (tab === 'entrar') onEnter()
                else onActivate()
              }}
            >
              {tab === 'activar' && (
                <Field label="Código de activación" hint="Te lo da quien te instala TuBodega.">
                  <Input icon={<KeyRound size={18} />} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} className="tracking-widest" />
                </Field>
              )}
              <Field label={tab === 'entrar' ? 'Usuario o correo' : 'Crea tu usuario'} hint={tab === 'activar' ? 'Un nombre corto, sin espacios. Ej: bodegaluis' : undefined}>
                <Input autoComplete="username" autoCapitalize="none" value={login} onChange={(e) => setLogin(e.target.value)} placeholder={tab === 'entrar' ? 'bodegaluis' : 'bodegaluis'} />
              </Field>
              <Field label={tab === 'entrar' ? 'Clave' : 'Crea tu clave'}>
                <Input type="password" autoComplete={tab === 'entrar' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              {tab === 'activar' && (
                <Field label="Repite la clave">
                  <Input type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
                </Field>
              )}
              {tab === 'activar' && <TermsCheck checked={agree} onChange={setAgree} />}
              {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
              <Button size="lg" type="submit" className="w-full" disabled={busy || !login || !password || (tab === 'activar' && (code.length < 6 || !agree))}>
                {busy ? 'Un momento…' : tab === 'entrar' ? 'Entrar' : 'Activar mi bodega'}
              </Button>
            </form>
          </>
        )}
      </div>
      <p className="text-center text-xs text-muted pb-6">
        ¿Olvidaste tu clave? Escríbele a quien te instaló la app.
        <span className="flex justify-center gap-3 mt-3 font-semibold">
          <a href="/conocer">Conocer TuBodega</a>
          <a href="/legal/terminos">Términos</a>
          <a href="/legal/privacidad">Privacidad</a>
        </span>
        <span className="block mt-2 opacity-60">Versión {BUILD}</span>
      </p>
      <StorageNotice />
    </div>
  )
}

function TermsCheck({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 mt-0.5 accent-[#2f9e6e] shrink-0" />
      <span>
        Acepto los{' '}
        <a href="/legal/terminos" target="_blank" className="font-semibold text-brand-700 underline">Términos y condiciones</a> y la{' '}
        <a href="/legal/privacidad" target="_blank" className="font-semibold text-brand-700 underline">Política de privacidad</a>. Entiendo que el ticket es una nota de entrega sin valor fiscal.
      </span>
    </label>
  )
}
