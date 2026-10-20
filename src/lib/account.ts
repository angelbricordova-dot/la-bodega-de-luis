import { create } from 'zustand'
import { cloudEnabled, loginToEmail, supabase } from './cloud'
import { licenseState, type CachedLicense, type StoreInfo } from './license'
import { lastCloudBackup, uploadCloudBackup } from './backup'
import { lastLocalChange } from '../db'

/**
 * Con qué cuenta se abrió la app en este teléfono:
 * - store: una bodega cliente (su base de datos local se llama tubodega-<id>)
 * - admin: el dueño de TuBodega, entra al panel
 * - demo: datos de ejemplo para mostrar la app en una visita de venta
 */
export type Account =
  | { mode: 'store'; storeId: string; userId: string; email: string; sessionRev?: number }
  | { mode: 'admin'; userId: string; email: string }
  | { mode: 'demo'; userId?: string; email?: string; isAdmin?: boolean }

const ACCOUNT_KEY = 'tubodega-account'
const LICENSE_KEY = 'tubodega-license'
const CONFIG_KEY = 'tubodega-config'

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* sin almacenamiento */
  }
}

export interface ProviderConfig {
  pago_movil?: string | null
  zelle?: string | null
  binance?: string | null
  whatsapp?: string | null
}

interface AccountState {
  account: Account | null
  license: CachedLicense | null
  config: ProviderConfig | null
}

export const useAccount = create<AccountState>(() => ({
  account: read<Account>(ACCOUNT_KEY),
  license: read<CachedLicense>(LICENSE_KEY),
  config: read<ProviderConfig>(CONFIG_KEY),
}))

export function setAccount(account: Account | null) {
  write(ACCOUNT_KEY, account)
  useAccount.setState({ account })
}

function setLicense(license: CachedLicense | null) {
  write(LICENSE_KEY, license)
  useAccount.setState({ license })
}

export function setConfig(config: ProviderConfig) {
  write(CONFIG_KEY, config)
  useAccount.setState({ config })
}

interface LicenseResponse {
  server_now: string
  is_admin: boolean
  role: 'owner' | 'seller' | null
  session_rev?: number
  store: StoreInfo | null
}

function toCached(r: LicenseResponse): CachedLicense {
  const now = Date.now()
  return { store: r.store, isAdmin: r.is_admin, role: r.role, sessionRev: r.session_rev ?? 0, checkedAt: now, offset: new Date(r.server_now).getTime() - now }
}

/** Pregunta al servidor el estado del plan (y le manda los números del día) */
export async function refreshLicense(stats?: Record<string, unknown>): Promise<CachedLicense> {
  const { data, error } = stats
    ? await supabase.rpc('heartbeat', { p_stats: stats })
    : await supabase.rpc('get_license')
  if (error) throw error
  const lic = toCached(data as LicenseResponse)
  setLicense(lic)
  return lic
}

export async function loadProviderConfig() {
  const { data } = await supabase.from('app_config').select('pago_movil, zelle, binance, whatsapp').eq('id', 1).maybeSingle()
  if (data) setConfig(data)
  return data as ProviderConfig | null
}

/** Decide a dónde va la cuenta después de entrar */
function accountFor(lic: CachedLicense, userId: string, email: string): Account | null {
  if (lic.store) return { mode: 'store', storeId: lic.store.id, userId, email, sessionRev: lic.sessionRev ?? 0 }
  if (lic.isAdmin) return { mode: 'admin', userId, email }
  return null
}

export async function signIn(login: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: loginToEmail(login), password })
  if (error) throw error
  const lic = await refreshLicense()
  const acc = accountFor(lic, data.user.id, data.user.email ?? '')
  if (acc) setAccount(acc)
  return { account: acc, license: lic }
}

/** Crea el usuario del bodeguero y lo vincula con su bodega usando el código */
export async function activate(code: string, login: string, password: string) {
  let { data: sess } = await supabase.auth.getSession()
  if (!sess.session) {
    const { data, error } = await supabase.auth.signUp({ email: loginToEmail(login), password })
    if (error) throw error
    if (!data.session) throw new Error('Supabase pide confirmar el correo. Desactiva "Confirm email" en Authentication o usa un correo real y confírmalo.')
    sess = { session: data.session }
  }
  const { data, error } = await supabase.rpc('claim_store', { p_code: code })
  if (error) throw error
  const lic = toCached(data as LicenseResponse)
  setLicense(lic)
  const user = sess.session!.user
  const acc = accountFor(lic, user.id, user.email ?? '')
  if (acc) setAccount(acc)
  return acc
}

export async function signOut() {
  try {
    await supabase.auth.signOut()
  } catch {
    /* sin internet: igual se limpia en el teléfono */
  }
  setAccount(null)
  setLicense(null)
  location.replace('/')
}

/** Cierra sesión subiendo antes un último respaldo si hay cambios sin respaldar */
export async function signOutSafely() {
  const acc = useAccount.getState().account
  if (acc?.mode === 'store' && navigator.onLine && lastLocalChange() > lastCloudBackup()) {
    try {
      await uploadCloudBackup(acc.storeId)
    } catch {
      /* se cierra igual: los datos siguen en el teléfono */
    }
  }
  await signOut()
}

export function enterDemo() {
  const acc = useAccount.getState().account
  setAccount({ mode: 'demo', userId: acc?.userId, email: acc?.email, isAdmin: acc?.mode === 'admin' || (acc?.mode === 'demo' && acc.isAdmin) })
  location.replace('/')
}

export function backToAdmin() {
  const acc = useAccount.getState().account
  if (acc?.mode === 'demo' && acc.isAdmin && acc.userId) {
    setAccount({ mode: 'admin', userId: acc.userId, email: acc.email ?? '' })
  }
  location.replace('/admin')
}

/** Estado actual del plan de la bodega abierta (null si no es una bodega con cuenta) */
export function currentLicense() {
  const { account, license } = useAccount.getState()
  if (!cloudEnabled || account?.mode !== 'store' || !license?.store) return null
  return licenseState(license.store, Date.now() + license.offset, license.checkedAt)
}

export function canSellNow() {
  const l = currentLicense()
  return !l || l.canSell
}

export function useLicenseState() {
  const { account, license } = useAccount()
  if (!cloudEnabled || account?.mode !== 'store' || !license?.store) return null
  return licenseState(license.store, Date.now() + license.offset, license.checkedAt)
}
