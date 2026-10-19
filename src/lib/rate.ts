/** Consulta la tasa oficial BCV. Devuelve null si no hay internet o la fuente falla. */
export async function fetchBcvRate(): Promise<number | null> {
  try {
    const r = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { cache: 'no-store' })
    if (!r.ok) return null
    const j = await r.json()
    const v = Number(j?.promedio ?? j?.price)
    return v > 0 ? v : null
  } catch {
    return null
  }
}
