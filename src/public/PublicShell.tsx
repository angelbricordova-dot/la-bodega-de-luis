import { useState, type ReactNode } from 'react'
import { Logo } from '../components/AuthScreen'
import { cx } from '../components/ui'

/** Marco de las páginas públicas (presentación y legales): se ven sin iniciar sesión */
export function PublicShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur pt-safe print:hidden">
        <div className={cx('h-16 px-4 mx-auto flex items-center justify-between', wide ? 'max-w-5xl' : 'max-w-2xl')}>
          <a href="/conocer" aria-label="TuBodega">
            <Logo className="scale-[.8] origin-left" />
          </a>
          <a href="/" className="h-10 px-4 rounded-2xl bg-ink text-white font-semibold text-sm grid place-items-center">
            Entrar
          </a>
        </div>
      </header>
      <main className={cx('mx-auto px-4 pb-16', wide ? 'max-w-5xl' : 'max-w-2xl')}>{children}</main>
      <StorageNotice />
    </div>
  )
}

export function PublicFooter() {
  return (
    <footer className="mt-12 pt-6 border-t border-line text-sm text-muted print:hidden">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <a href="/legal/terminos" className="hover:text-ink">Términos</a>
        <a href="/legal/privacidad" className="hover:text-ink">Privacidad</a>
        <a href="/legal/cookies" className="hover:text-ink">Cookies</a>
        <a href="/conocer" className="hover:text-ink">Conocer TuBodega</a>
      </div>
      <p className="mt-3 text-xs">© {new Date().getFullYear()} TuBodega. Los tickets son notas de entrega sin valor fiscal.</p>
    </footer>
  )
}

const NOTICE_KEY = 'tubodega-aviso-almacenamiento'

function noticeSeen() {
  try {
    return localStorage.getItem(NOTICE_KEY) === '1'
  } catch {
    return true
  }
}

/** Aviso informativo, una sola vez: solo usamos almacenamiento necesario, sin rastreo */
export function StorageNotice() {
  const [open, setOpen] = useState(() => !noticeSeen())
  if (!open) return null
  const close = () => {
    try {
      localStorage.setItem(NOTICE_KEY, '1')
    } catch {
      /* sin almacenamiento */
    }
    setOpen(false)
  }
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-safe print:hidden">
      <div className="max-w-md mx-auto rounded-3xl bg-ink text-white p-4 shadow-2xl flex gap-3 items-start">
        <p className="text-sm leading-snug flex-1">
          TuBodega guarda datos en tu teléfono solo para funcionar, incluso sin internet. Sin publicidad ni rastreo.{' '}
          <a href="/legal/cookies" className="underline font-semibold">Más información</a>
        </p>
        <button onClick={close} className="h-9 px-3.5 rounded-xl bg-white text-ink text-sm font-bold shrink-0">
          Entendido
        </button>
      </div>
    </div>
  )
}
