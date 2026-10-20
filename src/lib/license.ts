export type StoreStatus = 'trial' | 'active' | 'suspended' | 'cancelled'

export interface StoreInfo {
  id: string
  name: string
  owner_name?: string | null
  phone?: string | null
  rif?: string | null
  address?: string | null
  plan: 'basico' | 'pro'
  monthly_price: number
  status: StoreStatus
  paid_until: string
  referral_code?: string | null
  free_months?: number
  created_at?: string
}

/** Lo que guarda el teléfono de la última vez que habló con el servidor */
export interface CachedLicense {
  store: StoreInfo | null
  isAdmin: boolean
  role?: 'owner' | 'seller' | null
  /** Sube cuando el admin cierra la sesión de este usuario */
  sessionRev?: number
  /** En el plan Básico, si este teléfono es el habilitado para vender */
  deviceOk?: boolean
  devicesActive?: number
  /** Cuándo se confirmó con el servidor (hora del teléfono) */
  checkedAt: number
  /** Diferencia entre la hora del servidor y la del teléfono */
  offset: number
}

export const GRACE_DAYS = 3
export const WARN_DAYS = 3
export const OFFLINE_DAYS = 7
const DAY = 864e5

export type LicenseMode = 'prueba' | 'activa' | 'aviso' | 'gracia' | 'vencida' | 'suspendida' | 'conectar' | 'dispositivo'

export interface LicenseState {
  mode: LicenseMode
  /** Puede registrar ventas */
  canSell: boolean
  daysLeft: number
  paidUntil: number
  message: string
}

/** Calcula el estado del plan; se usa igual en la app y en el panel del admin */
export function licenseState(store: Pick<StoreInfo, 'status' | 'paid_until'>, now: number, checkedAt = now, deviceOk = true): LicenseState {
  const paidUntil = new Date(store.paid_until).getTime()
  const daysLeft = Math.ceil((paidUntil - now) / DAY)
  const fecha = new Date(paidUntil).toLocaleDateString('es-VE', { day: 'numeric', month: 'long' })
  if (store.status === 'suspended' || store.status === 'cancelled') {
    return { mode: 'suspendida', canSell: false, daysLeft, paidUntil, message: 'Tu cuenta está suspendida. Puedes ver y respaldar tus datos, pero no vender.' }
  }
  if (now - checkedAt > OFFLINE_DAYS * DAY) {
    return { mode: 'conectar', canSell: false, daysLeft, paidUntil, message: 'Conéctate a internet para confirmar tu plan. Tus datos están seguros.' }
  }
  if (now > paidUntil + GRACE_DAYS * DAY) {
    return { mode: 'vencida', canSell: false, daysLeft, paidUntil, message: 'Tu plan venció. Reporta tu pago para seguir vendiendo; tus datos están completos.' }
  }
  if (!deviceOk) {
    return { mode: 'dispositivo', canSell: false, daysLeft, paidUntil, message: 'Tu plan Básico es para 1 teléfono y se está usando en otro. Este teléfono queda en solo lectura.' }
  }
  if (now > paidUntil) {
    const left = Math.max(0, Math.ceil((paidUntil + GRACE_DAYS * DAY - now) / DAY))
    return { mode: 'gracia', canSell: true, daysLeft, paidUntil, message: `Tu plan venció el ${fecha}. Te quedan ${left} día(s) de gracia.` }
  }
  if (store.status === 'trial') {
    return { mode: 'prueba', canSell: true, daysLeft, paidUntil, message: `Prueba gratis: quedan ${daysLeft} día(s).` }
  }
  if (daysLeft <= WARN_DAYS) {
    return { mode: 'aviso', canSell: true, daysLeft, paidUntil, message: `Tu plan vence el ${fecha}. Reporta tu pago para no interrumpir.` }
  }
  return { mode: 'activa', canSell: true, daysLeft, paidUntil, message: `Plan al día hasta el ${fecha}.` }
}
