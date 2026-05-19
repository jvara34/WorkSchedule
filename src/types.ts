export type ShiftType = 'morning' | 'afternoon' | 'fullday'

export type ShiftEntry = {
  id: string
  name: string
  startTime: string // "HH:MM" 24h
  endTime: string   // "HH:MM" 24h
  shiftType: ShiftType
  hasLunch?: boolean
}

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

export type WeekSchedule = Record<DayKey, ShiftEntry[]>

export type Roster = string[]
