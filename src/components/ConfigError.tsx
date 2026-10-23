import { AlertTriangle } from 'lucide-react'
import { BUILD } from '../lib/cloud'
import { Logo } from './AuthScreen'

/** Se muestra cuando la app se publicó sin las variables de Supabase */
export default function ConfigError() {
  return (
    <div className="min-h-dvh max-w-md mx-auto px-6 pt-safe flex flex-col justify-center py-10">
      <Logo className="justify-center mb-6" />
      <div className="rounded-3xl bg-surface border border-line p-5">
        <p className="flex items-center gap-2 font-bold text-red-600">
          <AlertTriangle size={20} /> Falta conectar la app con Supabase
        </p>
        <p className="text-sm text-muted mt-2">Esta publicación no tiene las variables de Supabase, por eso no puede pedir usuario y clave.</p>
        <ol className="text-sm mt-4 space-y-2 list-decimal pl-5">
          <li>
            En Vercel, abre el proyecto → <b>Settings → Environment Variables</b>.
          </li>
          <li>
            Agrega <code className="font-mono text-[13px] bg-canvas px-1 rounded">VITE_SUPABASE_URL</code> y{' '}
            <code className="font-mono text-[13px] bg-canvas px-1 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code>, con el nombre exacto y marcando <b>Production</b>.
          </li>
          <li>
            Ve a <b>Deployments</b> → último → <b>⋯ → Redeploy</b>.
          </li>
        </ol>
      </div>
      <p className="text-center text-xs text-muted mt-6">Versión {BUILD}</p>
    </div>
  )
}
