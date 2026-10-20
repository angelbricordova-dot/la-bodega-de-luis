import Dexie from 'dexie'
import { create } from 'zustand'
import { DEFAULT_SETTINGS, SYNC_TABLES, db, markRemote, readTombstones, setTrackDeletes, writeTombstones, type SyncTable } from '../db'
import { supabase } from './cloud'
import { deviceId, uploadCloudBackup } from './backup'

/**
 * Sincronización entre los teléfonos de una bodega.
 *
 * - Cada registro cambiado en este teléfono lleva _u (hora local del cambio) y se sube con sync_push.
 * - El servidor numera cada cambio (seq). Cada teléfono baja lo que tenga seq mayor al último que vio.
 * - Si un registro tiene cambios locales sin subir, gana el local: se sube después y queda con un seq más nuevo.
 * - El stock no se sincroniza como número: se recalcula sumando los movimientos de inventario,
 *   que solo se agregan. Así dos teléfonos que venden a la vez no se pisan el stock.
 */

/** Ajustes que son de cada teléfono y no se comparten */
const LOCAL_SETTINGS = ['printing', 'currentSeller', 'nextSaleNumber', 'nextQuoteNumber'] as const
const PULL_PAGE = 500
const PUSH_PAGE = 400
/** Se vuelve a bajar un poco hacia atrás por si un cambio llegó al servidor un instante tarde */
const PULL_OVERLAP = 50

type Row = Record<string, unknown> & { id: number | string; _u?: number; _s?: number }

interface SyncState {
  lastSeq: number
  lastPushAt: number
  init: boolean
}

export type SyncStatus = 'off' | 'syncing' | 'ok' | 'offline' | 'error'

export const useSync = create<{ status: SyncStatus; pending: number; lastSyncAt: number; firstLoad: boolean; error: string; notice: string }>(() => ({
  status: 'off',
  pending: 0,
  lastSyncAt: 0,
  firstLoad: false,
  error: '',
  notice: '',
}))

const stateKey = (storeId: string) => `tubodega-sync-${storeId}`

function readState(storeId: string): SyncState {
  try {
    return { lastSeq: 0, lastPushAt: 0, init: false, ...JSON.parse(localStorage.getItem(stateKey(storeId)) || '{}') }
  } catch {
    return { lastSeq: 0, lastPushAt: 0, init: false }
  }
}

function writeState(storeId: string, st: SyncState) {
  try {
    localStorage.setItem(stateKey(storeId), JSON.stringify(st))
  } catch {
    /* sin almacenamiento */
  }
}

const keyOf = (tbl: string, rowId: string) => (tbl === 'settings' ? rowId : Number(rowId))

function clean(tbl: string, row: Row) {
  const { _u, _s, ...data } = row
  void _u
  void _s
  if (tbl === 'settings') for (const k of LOCAL_SETTINGS) delete (data as Record<string, unknown>)[k]
  return data
}

/** Cuántos cambios de este teléfono faltan por subir */
export async function countPending(storeId: string) {
  const st = readState(storeId)
  let n = readTombstones().length
  for (const t of SYNC_TABLES) n += await db.table(t).where('_u').above(st.lastPushAt).count()
  return n
}

async function push(storeId: string, full = false) {
  const st = readState(storeId)
  const startedAt = Date.now()
  const rows: { t: string; id: string; d?: unknown; del?: boolean }[] = []
  for (const t of SYNC_TABLES) {
    const table = db.table(t)
    const changed: Row[] = full ? await table.toArray() : await table.where('_u').above(st.lastPushAt).toArray()
    for (const r of changed) rows.push({ t, id: String(r.id), d: clean(t, r) })
  }
  const tombs = readTombstones()
  for (const d of tombs) rows.push({ t: d.t, id: d.id, del: true })
  for (let i = 0; i < rows.length; i += PUSH_PAGE) {
    const { error } = await supabase.rpc('sync_push', { p_device: deviceId(), p_rows: rows.slice(i, i + PUSH_PAGE) })
    if (error) throw error
  }
  // Solo se quitan las marcas de borrado que ya subieron (pudieron llegar nuevas mientras tanto)
  const sent = new Set(tombs.map((d) => `${d.t}:${d.id}`))
  writeTombstones(readTombstones().filter((d) => !sent.has(`${d.t}:${d.id}`)))
  writeState(storeId, { ...readState(storeId), lastPushAt: startedAt })
  return rows.length
}

interface RemoteRow {
  tbl: SyncTable
  row_id: string
  data: Row | null
  deleted: boolean
  seq: number
}

/** Guarda en este teléfono los cambios que llegaron de otros teléfonos */
async function apply(storeId: string, rows: RemoteRow[]) {
  if (!rows.length) return
  const st = readState(storeId)
  await db.transaction('rw', SYNC_TABLES.map((t) => db.table(t)), async () => {
    markRemote(Dexie.currentTransaction)
    const touched = new Set<number>()
    for (const r of rows) {
      if (!SYNC_TABLES.includes(r.tbl)) continue
      const table = db.table(r.tbl)
      const key = keyOf(r.tbl, r.row_id)
      const local = (await table.get(key)) as Row | undefined
      if (local && (local._s ?? 0) >= r.seq) continue
      if (local && (local._u ?? 0) > st.lastPushAt) continue // cambio local pendiente: gana el local
      if (r.deleted || !r.data) {
        if (local) await table.delete(key)
      } else {
        let next: Row = { ...r.data, id: key, _s: r.seq, _u: 0 }
        if (r.tbl === 'settings') {
          const keep: Record<string, unknown> = {}
          for (const k of LOCAL_SETTINGS) keep[k] = (local as Record<string, unknown> | undefined)?.[k] ?? DEFAULT_SETTINGS[k]
          next = { ...DEFAULT_SETTINGS, ...next, ...keep }
        }
        await table.put(next)
      }
      if (r.tbl === 'products') touched.add(Number(key))
      if (r.tbl === 'stockMoves' && r.data && typeof r.data.productId === 'number') touched.add(r.data.productId)
    }
    await recomputeStock([...touched])
  })
}

/** Stock = suma de todos los movimientos del producto (de todos los teléfonos) */
async function recomputeStock(productIds: number[]) {
  for (const pid of productIds) {
    const p = await db.products.get(pid)
    if (!p) continue
    const moves = await db.stockMoves.where('productId').equals(pid).toArray()
    if (!moves.length) continue
    const stock = Math.round(moves.reduce((a, m) => a + m.qty, 0) * 1000) / 1000
    if (stock !== p.stock) await db.products.update(pid, { stock })
  }
}

async function pull(storeId: string, from?: number) {
  let after = from ?? Math.max(0, readState(storeId).lastSeq - PULL_OVERLAP)
  let maxSeq = readState(storeId).lastSeq
  let total = 0
  for (;;) {
    const { data, error } = await supabase
      .from('sync_rows')
      .select('tbl, row_id, data, deleted, seq')
      .gt('seq', after)
      .order('seq', { ascending: true })
      .limit(PULL_PAGE)
    if (error) throw error
    const rows = (data ?? []) as RemoteRow[]
    await apply(storeId, rows)
    total += rows.length
    if (rows.length) {
      after = rows[rows.length - 1].seq
      maxSeq = Math.max(maxSeq, after)
    }
    if (rows.length < PULL_PAGE) break
  }
  writeState(storeId, { ...readState(storeId), lastSeq: maxSeq })
  return total
}

/** Antes de subir por primera vez: que la suma de movimientos cuadre con el stock de cada producto */
async function reconcileStockMoves() {
  const now = Date.now()
  for (const p of await db.products.toArray()) {
    const moves = await db.stockMoves.where('productId').equals(p.id!).toArray()
    const sum = moves.reduce((a, m) => a + m.qty, 0)
    const diff = Math.round((p.stock - sum) * 1000) / 1000
    if (Math.abs(diff) > 0.0005) {
      await db.stockMoves.add({ productId: p.id!, type: 'inicial', qty: diff, stockAfter: p.stock, note: 'Saldo inicial', createdAt: now })
    }
  }
}

/** Datos creados por la app vieja (ids 1, 2, 3...) que podrían chocar con los de otro teléfono */
async function hasLegacyIds() {
  for (const t of SYNC_TABLES) {
    if (t === 'settings') continue
    const first = (await db.table(t).orderBy(':id').first()) as Row | undefined
    if (first && typeof first.id === 'number' && first.id < 1e12 && first._s == null) return true
  }
  return false
}

/**
 * Primera vez que este teléfono sincroniza:
 * - si la nube está vacía, este teléfono sube todo (es el primero de la bodega);
 * - si la nube ya tiene datos, se juntan con los de este teléfono. Si este teléfono tiene datos de
 *   la versión vieja (ids que podrían chocar), se respaldan y se reemplazan por los de la nube.
 */
async function firstSync(storeId: string) {
  const { count, error } = await supabase.from('sync_rows').select('row_id', { count: 'exact', head: true })
  if (error) throw error
  if (!count) {
    await reconcileStockMoves()
    await push(storeId, true)
    await pull(storeId, 0)
  } else {
    useSync.setState({ firstLoad: true })
    const legacy = await hasLegacyIds()
    if (legacy) {
      try {
        await uploadCloudBackup(storeId)
      } catch {
        /* sigue: los datos nuevos vienen de la nube */
      }
    }
    const device = await db.settings.get('main')
    await db.transaction('rw', SYNC_TABLES.map((t) => db.table(t)), async () => {
      markRemote(Dexie.currentTransaction)
      if (legacy) {
        for (const t of SYNC_TABLES) await db.table(t).clear()
      } else {
        // Las categorías de arranque y los ajustes por defecto no deben pisar los de la bodega
        const used = new Set((await db.products.toArray()).map((p) => p.categoryId))
        const seeds = (await db.categories.toArray()).filter((c) => (c as unknown as { _seed?: boolean })._seed && !used.has(c.id))
        await db.categories.bulkDelete(seeds.map((c) => c.id!))
        if (device) await db.settings.update('main', { _u: 0 } as never)
      }
    })
    writeState(storeId, { ...readState(storeId), lastPushAt: 0 })
    await pull(storeId, 0)
    if (legacy && device) {
      const keep: Record<string, unknown> = {}
      for (const k of LOCAL_SETTINGS) keep[k] = device[k]
      await db.transaction('rw', db.settings, async () => {
        markRemote(Dexie.currentTransaction)
        const cur = await db.settings.get('main')
        await db.settings.put({ ...DEFAULT_SETTINGS, ...cur, ...keep, id: 'main' })
      })
    }
    if (!legacy) await push(storeId)
    useSync.setState({
      firstLoad: false,
      notice: legacy ? 'Se cargaron los datos de la bodega desde la nube. Los que tenía este teléfono quedaron respaldados.' : '',
    })
  }
  writeState(storeId, { ...readState(storeId), init: true })
}

let running: Promise<void> | null = null
let again = false

/** Sube y baja cambios. Si ya está corriendo, deja otra vuelta pendiente. */
export function syncNow(storeId: string): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      if (!navigator.onLine) {
        useSync.setState({ status: 'offline', pending: await countPending(storeId) })
        break
      }
      useSync.setState({ status: 'syncing' })
      try {
        if (!readState(storeId).init) await firstSync(storeId)
        else {
          await push(storeId)
          await pull(storeId)
        }
        useSync.setState({ status: 'ok', lastSyncAt: Date.now(), pending: await countPending(storeId), error: '' })
      } catch (e) {
        console.warn('Sincronización falló', e)
        useSync.setState({ status: 'error', error: (e as Error).message, pending: await countPending(storeId), firstLoad: false })
        break
      }
    } while (again)
  })().finally(() => {
    running = null
  })
  return running
}

/** Arranca la sincronización de la bodega: tiempo real, cada 30 s y al guardar cambios */
export function startSync(storeId: string, onLocalChange: (fn: () => void) => () => void) {
  setTrackDeletes(true)
  let pushTimer = 0
  let pullTimer = 0
  const soon = (ms: number) => {
    clearTimeout(pushTimer)
    pushTimer = window.setTimeout(() => syncNow(storeId), ms)
  }
  const offChange = onLocalChange(() => {
    countPending(storeId).then((pending) => useSync.setState({ pending }))
    soon(1500)
  })
  const channel = supabase
    .channel(`sync-${storeId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_rows', filter: `store_id=eq.${storeId}` }, () => {
      clearTimeout(pullTimer)
      pullTimer = window.setTimeout(() => syncNow(storeId), 700)
    })
    .subscribe()
  const interval = window.setInterval(() => document.visibilityState === 'visible' && syncNow(storeId), 30_000)
  const onOnline = () => syncNow(storeId)
  const onVisible = () => document.visibilityState === 'visible' && syncNow(storeId)
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
  syncNow(storeId)
  return () => {
    offChange()
    clearTimeout(pushTimer)
    clearTimeout(pullTimer)
    clearInterval(interval)
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    supabase.removeChannel(channel)
    setTrackDeletes(false)
  }
}
