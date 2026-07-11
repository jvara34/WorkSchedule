import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { DayKey, Roster, ShiftEntry, WeekSchedule } from './types'

export type AppStateKey = 'schedule_a' | 'schedule_b' | 'roster' | 'label_a' | 'label_b'

export const EMPTY_SCHEDULE: WeekSchedule = {
  monday: [], tuesday: [], wednesday: [], thursday: [], friday: [],
}

const DAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

// localStorage keys predate the backend — kept so existing caches still load.
const CACHE_KEYS: Record<AppStateKey, string> = {
  schedule_a: 'asua_schedule',
  schedule_b: 'asua_schedule_b',
  roster: 'asua_roster',
  label_a: 'asua_label_a',
  label_b: 'asua_label_b',
}

// ---------- localStorage cache ----------

export function loadCachedSchedule(key: 'schedule_a' | 'schedule_b'): WeekSchedule {
  try {
    const raw = localStorage.getItem(CACHE_KEYS[key])
    return raw ? sanitizeSchedule(JSON.parse(raw)) : EMPTY_SCHEDULE
  } catch { return EMPTY_SCHEDULE }
}

export function loadCachedRoster(): Roster {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.roster)
    return raw ? sanitizeRoster(JSON.parse(raw)) : []
  } catch { return [] }
}

// Labels are stored as raw strings, not JSON.
export function loadCachedLabel(key: 'label_a' | 'label_b', fallback: string): string {
  return localStorage.getItem(CACHE_KEYS[key]) ?? fallback
}

export function writeCache(key: AppStateKey, value: unknown) {
  const raw = key === 'label_a' || key === 'label_b' ? String(value) : JSON.stringify(value)
  localStorage.setItem(CACHE_KEYS[key], raw)
}

// ---------- sanitizers (server data is untrusted at parse time) ----------

function isShiftEntry(e: unknown): e is ShiftEntry {
  if (!e || typeof e !== 'object') return false
  const s = e as Record<string, unknown>
  return typeof s.id === 'string' && typeof s.name === 'string'
    && typeof s.startTime === 'string' && typeof s.endTime === 'string'
}

export function sanitizeSchedule(v: unknown): WeekSchedule {
  if (!v || typeof v !== 'object') return EMPTY_SCHEDULE
  const out = { ...EMPTY_SCHEDULE }
  for (const day of DAY_KEYS) {
    const arr = (v as Record<string, unknown>)[day]
    out[day] = Array.isArray(arr) ? arr.filter(isShiftEntry) : []
  }
  return out
}

export function sanitizeRoster(v: unknown): Roster {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export function sanitizeLabel(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v : fallback
}

export function scheduleHasShifts(s: WeekSchedule): boolean {
  return DAY_KEYS.some(day => s[day].length > 0)
}

// ---------- Firestore sync ----------

export async function push(key: AppStateKey, value: unknown): Promise<{ error: string | null }> {
  if (!isFirebaseConfigured) return { error: 'Firebase is not configured' }
  try {
    await setDoc(doc(db, 'appState', key), { value })
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export function subscribe(handlers: {
  onChange: (key: AppStateKey, value: unknown) => void
  onFirstSnapshot: (values: Partial<Record<AppStateKey, unknown>>) => void
  onStatus: (status: 'live' | 'offline') => void
}): () => void {
  if (!isFirebaseConfigured) {
    handlers.onStatus('offline')
    return () => {}
  }
  let first = true
  return onSnapshot(
    collection(db, 'appState'),
    snapshot => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'removed') continue
        handlers.onChange(change.doc.id as AppStateKey, change.doc.data().value)
      }
      if (first) {
        first = false
        const values: Partial<Record<AppStateKey, unknown>> = {}
        for (const d of snapshot.docs) values[d.id as AppStateKey] = d.data().value
        handlers.onFirstSnapshot(values)
      }
      handlers.onStatus('live')
    },
    () => handlers.onStatus('offline'),
  )
}
