import { useEffect, useState } from 'react'
import { cloudEnabled, supabase } from './cloud'

/** Cambia esta fecha cuando cambien los Términos: a cada usuario se le vuelve a pedir que los acepte */
export const TERMS_VERSION = '2026-10-23'
export const TERMS_UPDATED = '23 de octubre de 2026'

export interface PublicInfo {
  whatsapp?: string | null
  legal_name?: string | null
  legal_id?: string | null
  legal_email?: string | null
  legal_city?: string | null
}

const KEY = 'tubodega-public-info'

function cached(): PublicInfo {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as PublicInfo
  } catch {
    return {}
  }
}

/** Datos públicos del responsable de TuBodega (los carga el admin en Ajustes) */
export function usePublicInfo() {
  const [info, setInfo] = useState<PublicInfo>(cached)
  useEffect(() => {
    if (!cloudEnabled) return
    supabase.rpc('public_info').then(({ data }) => {
      if (!data) return
      setInfo(data as PublicInfo)
      try {
        localStorage.setItem(KEY, JSON.stringify(data))
      } catch {
        /* sin almacenamiento */
      }
    })
  }, [])
  return info
}

export function waNumber(phone?: string | null) {
  return (phone ?? '').replace(/\D/g, '').replace(/^0/, '58')
}

export function waUrl(phone: string | null | undefined, text: string) {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`
}
