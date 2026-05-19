import type { ShiftEntry, ShiftType, WeekSchedule } from './types'

// Convert "HH:MM" to minutes since midnight
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const MORNING_START = toMinutes('08:30')
const MORNING_END = toMinutes('13:30')
const AFTERNOON_START = toMinutes('13:30')
const AFTERNOON_END = toMinutes('16:30')

export function classifyShift(startTime: string, endTime: string): ShiftType {
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  if (end - start >= 480) return 'fullday'
  const morningOverlap = Math.max(0, Math.min(end, MORNING_END) - Math.max(start, MORNING_START))
  const afternoonOverlap = Math.max(0, Math.min(end, AFTERNOON_END) - Math.max(start, AFTERNOON_START))
  return afternoonOverlap > morningOverlap ? 'afternoon' : 'morning'
}

export function shiftDuration(entry: ShiftEntry): number {
  const raw = toMinutes(entry.endTime) - toMinutes(entry.startTime)
  return entry.hasLunch ? raw - 30 : raw
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function workerWeeklyMinutes(schedule: WeekSchedule): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const entries of Object.values(schedule)) {
    for (const entry of entries) {
      totals[entry.name] = (totals[entry.name] ?? 0) + shiftDuration(entry)
    }
  }
  return totals
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}
