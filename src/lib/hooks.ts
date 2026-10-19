import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_SETTINGS, db, type Settings } from '../db'

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get('main'), [])
  return s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS
}

export function useOpenCash() {
  return useLiveQuery(async () => (await db.cashSessions.toArray()).find((c) => !c.closedAt) ?? null, [])
}
