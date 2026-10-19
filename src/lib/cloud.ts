import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** Sin estas variables la app funciona como antes: solo en el teléfono, sin cuentas */
export const cloudEnabled = !!(url && key)

export const supabase = createClient(url || 'http://localhost', key || 'none', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tubodega-auth' },
})

/** Los usuarios sin correo entran con un nombre: se convierte en un correo interno */
export const USER_DOMAIN = 'cuentas.tubodega.app'

export function loginToEmail(login: string) {
  const v = login.trim().toLowerCase()
  if (v.includes('@')) return v
  const slug = v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._-]/g, '')
  return `${slug}@${USER_DOMAIN}`
}

export function emailToLogin(email?: string | null) {
  if (!email) return ''
  return email.endsWith('@' + USER_DOMAIN) ? email.slice(0, -USER_DOMAIN.length - 1) : email
}

const ERRORS: Record<string, string> = {
  codigo_invalido: 'El código de activación no es válido o ya se usó.',
  ya_vinculado: 'Esta cuenta ya está vinculada a una bodega.',
  sin_bodega: 'Esta cuenta no tiene una bodega asignada.',
  demasiados_pendientes: 'Ya tienes varios pagos esperando confirmación.',
  solo_admin: 'Solo el administrador puede hacer esto.',
  pago_no_pendiente: 'Ese pago ya fue revisado.',
  codigo_referido_invalido: 'El código de referido no existe.',
  clave_corta: 'La clave debe tener al menos 6 caracteres.',
  'Invalid login credentials': 'Usuario o clave incorrectos.',
  'User already registered': 'Ese usuario ya existe. Elige otro nombre o inicia sesión.',
  'Failed to fetch': 'Sin conexión a internet.',
}

export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e)
  for (const [k, v] of Object.entries(ERRORS)) if (msg.includes(k)) return v
  return msg
}
