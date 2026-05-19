import { useState, useRef, type DragEvent } from 'react'
import { nanoid } from 'nanoid'
import type { DayKey, WeekSchedule } from '../types'
import { classifyShift } from '../utils'

type Props = {
  onImport: (schedule: WeekSchedule) => void
  onClose: () => void
}

const DAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const SLOT_STARTS = [
  '08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00',
  '12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00',
]
const SLOT_END = '16:30'

const DAY_NAME_MAP: Record<string, DayKey> = {
  monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday',
  thursday: 'thursday', friday: 'friday',
}

function parseDays(cell: string): DayKey[] {
  return cell.split(',')
    .map(d => DAY_NAME_MAP[d.trim().toLowerCase()])
    .filter((d): d is DayKey => !!d)
}

// Parse a CSV line respecting quoted fields (fields may contain commas inside quotes)
function parseLine(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuote = !inQuote }
    else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  cols.push(cur.trim())
  return cols
}

function parseCsv(text: string): { schedule: WeekSchedule; errors: string[] } {
  const errors: string[] = []
  const empty: WeekSchedule = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] }

  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) { return { schedule: empty, errors: ['File appears empty.'] } }

  // Find all slot column indices from the header (columns whose header starts with "Week [")
  const headerCols = parseLine(lines[0])
  const slotColIndices: number[] = []
  headerCols.forEach((h, i) => { if (h.startsWith('Week [')) slotColIndices.push(i) })

  if (slotColIndices.length === 0) {
    return { schedule: empty, errors: ['Could not find availability columns (expected "Week [...]" headers).'] }
  }

  // Group slot column indices into sets of 16 (one per form section)
  const slotSets: number[][] = []
  for (let i = 0; i < slotColIndices.length; i += 16) {
    slotSets.push(slotColIndices.slice(i, i + 16))
  }

  const result: WeekSchedule = { ...empty }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = parseLine(line)
    const name = cols[1]?.trim()
    if (!name) continue

    // Union of slot indices per day across all slot sets
    const daySlots: Record<DayKey, Set<number>> = {
      monday: new Set(), tuesday: new Set(), wednesday: new Set(),
      thursday: new Set(), friday: new Set(),
    }

    for (const slotSet of slotSets) {
      slotSet.forEach((colIdx, slotIdx) => {
        const cell = cols[colIdx] ?? ''
        for (const day of parseDays(cell)) {
          daySlots[day].add(slotIdx)
        }
      })
    }

    // Skip student if no availability at all
    const hasAny = DAY_KEYS.some(d => daySlots[d].size > 0)
    if (!hasAny) continue

    // Merge consecutive slot indices per day into shift entries
    for (const day of DAY_KEYS) {
      const sorted = Array.from(daySlots[day]).sort((a, b) => a - b)
      if (sorted.length === 0) continue

      let runStart = sorted[0]
      let runEnd = sorted[0]
      for (let s = 1; s <= sorted.length; s++) {
        if (s < sorted.length && sorted[s] === runEnd + 1) {
          runEnd = sorted[s]
        } else {
          const startTime = SLOT_STARTS[runStart]
          const endTime = runEnd + 1 < SLOT_STARTS.length ? SLOT_STARTS[runEnd + 1] : SLOT_END
          result[day].push({
            id: nanoid(),
            name,
            startTime,
            endTime,
            shiftType: classifyShift(startTime, endTime),
          })
          if (s < sorted.length) { runStart = sorted[s]; runEnd = sorted[s] }
        }
      }
    }
  }

  const total = DAY_KEYS.reduce((s, d) => s + result[d].length, 0)
  if (total === 0 && errors.length === 0) errors.push('No availability found. Workers with no slots marked are skipped.')

  return { schedule: result, errors }
}

function countShifts(schedule: WeekSchedule) {
  return Object.values(schedule).reduce((sum, entries) => sum + entries.length, 0)
}

export default function CsvImportModal({ onImport, onClose }: Props) {
  const [parsed, setParsed] = useState<WeekSchedule | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setErrors(['Please upload a .csv file.'])
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const result = parseCsv(text)
      setParsed(result.schedule)
      setErrors(result.errors)
    }
    reader.readAsText(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const shiftCount = parsed ? countShifts(parsed) : 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 4 }}>Import CSV</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#555' }}>
          Upload the Google Form availability export. Workers with no slots selected are skipped automatically.
        </p>

        <div
          className={`csv-drop-zone${dragging ? ' csv-drop-zone-active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {parsed
            ? <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ {shiftCount} shift{shiftCount !== 1 ? 's' : ''} parsed</span>
            : <span>Drop CSV here or <u>click to browse</u></span>
          }
        </div>

        {errors.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {errors.map((err, i) => (
              <div key={i} className="form-error" style={{ marginBottom: 4 }}>{err}</div>
            ))}
          </div>
        )}

        {parsed && shiftCount > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#333' }}>
            <strong>Preview:</strong>
            {DAY_KEYS.map((day, i) => parsed[day].length > 0 && (
              <div key={day} style={{ marginTop: 6 }}>
                <strong>{DAY_LABELS[i]}:</strong>{' '}
                {parsed[day].map(e => `${e.name} (${e.startTime}–${e.endTime})`).join(', ')}
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!parsed || shiftCount === 0}
            onClick={() => { if (parsed) { onImport(parsed); onClose() } }}
          >
            Import {shiftCount > 0 ? `${shiftCount} Shift${shiftCount !== 1 ? 's' : ''}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
