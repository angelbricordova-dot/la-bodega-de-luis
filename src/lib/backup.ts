import { db } from '../db'
import { supabase } from './cloud'

const APP = 'la-bodega-de-luis'
const BACKUP_AT_KEY = 'tubodega-backup-at'

export async function buildBackup() {
  const data: Record<string, unknown[]> = {}
  for (const t of db.tables) data[t.name] = await t.toArray()
  return { app: APP, version: 1, at: Date.now(), data }
}

export async function restoreBackup(json: { app?: string; data?: Record<string, unknown[]> }) {
  if (json?.app !== APP || !json.data) throw new Error('El archivo no es un respaldo de esta app')
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      await t.clear()
      const rows = json.data![t.name]
      if (Array.isArray(rows) && rows.length) await t.bulkAdd(rows)
    }
  })
}

async function gzip(text: string): Promise<Blob> {
  if (typeof CompressionStream === 'undefined') return new Blob([text], { type: 'application/json' })
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Response(stream).blob()
}

async function gunzip(blob: Blob): Promise<string> {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
  if (head[0] !== 0x1f || head[1] !== 0x8b) return blob.text()
  return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text()
}

export function lastCloudBackup() {
  try {
    return Number(localStorage.getItem(BACKUP_AT_KEY) || 0)
  } catch {
    return 0
  }
}

/** Sube el respaldo: el último y uno por día de la semana (7 días de historia) */
export async function uploadCloudBackup(storeId: string) {
  const blob = await gzip(JSON.stringify(await buildBackup()))
  const bucket = supabase.storage.from('backups')
  const opts = { upsert: true, contentType: 'application/gzip' }
  const latest = await bucket.upload(`${storeId}/latest.json.gz`, blob, opts)
  if (latest.error) throw latest.error
  await bucket.upload(`${storeId}/dia-${new Date().getDay()}.json.gz`, blob, opts)
  await supabase.rpc('mark_backup')
  try {
    localStorage.setItem(BACKUP_AT_KEY, String(Date.now()))
  } catch {
    /* sin almacenamiento */
  }
}

export async function findCloudBackup(storeId: string) {
  const { data } = await supabase.storage.from('backups').list(storeId, { search: 'latest' })
  const f = data?.find((x) => x.name === 'latest.json.gz')
  return f ? { updatedAt: f.updated_at ?? f.created_at ?? '' } : null
}

export async function restoreCloudBackup(storeId: string) {
  const { data, error } = await supabase.storage.from('backups').download(`${storeId}/latest.json.gz`)
  if (error) throw error
  await restoreBackup(JSON.parse(await gunzip(data)))
}
