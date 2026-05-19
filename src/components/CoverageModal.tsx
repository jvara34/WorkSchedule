import type { WeekSchedule, DayKey, ShiftEntry } from '../types'
import { formatTime } from '../utils'

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
]

const DAY_START = 8 * 60 + 30  // 8:30 AM in minutes
const DAY_END = 16 * 60 + 30   // 4:30 PM in minutes
const DAY_SPAN = DAY_END - DAY_START

const SHIFT_COLORS = ['#3B82F6', '#F97316', '#22C55E', '#A855F7', '#EF4444', '#14B8A6', '#F59E0B']

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function pct(minutes: number): string {
  return `${((minutes - DAY_START) / DAY_SPAN) * 100}%`
}

function widthPct(start: number, end: number): string {
  return `${((end - start) / DAY_SPAN) * 100}%`
}

const HOUR_MARKS = [9, 10, 11, 12, 13, 14, 15, 16]

type Props = {
  schedule: WeekSchedule
  onClose: () => void
}

function DayRow({ label, entries }: { label: string; entries: ShiftEntry[] }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' }}>{label}</div>
      <div style={{ position: 'relative', height: entries.length === 0 ? 28 : Math.max(28, entries.length * 26 + 4), background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
        {HOUR_MARKS.map(h => (
          <div
            key={h}
            style={{
              position: 'absolute',
              left: pct(h * 60),
              top: 0,
              bottom: 0,
              borderLeft: '1px dashed #CBD5E1',
              pointerEvents: 'none',
            }}
          />
        ))}
        {entries.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 10, fontSize: 12, color: '#94A3B8' }}>No shifts</div>
        )}
        {entries.map((e, i) => {
          const start = Math.max(toMinutes(e.startTime), DAY_START)
          const end = Math.min(toMinutes(e.endTime), DAY_END)
          const color = SHIFT_COLORS[i % SHIFT_COLORS.length]
          return (
            <div
              key={e.id}
              title={`${e.name}: ${formatTime(e.startTime)} – ${formatTime(e.endTime)}`}
              style={{
                position: 'absolute',
                left: pct(start),
                width: widthPct(start, end),
                top: 3 + i * 26,
                height: 22,
                background: color,
                opacity: 0.85,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 6,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>{e.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TIME_RULER = (
  <div style={{ position: 'relative', height: 20, flexShrink: 0, marginBottom: 6 }}>
    {HOUR_MARKS.map(h => (
      <span
        key={h}
        style={{
          position: 'absolute',
          left: pct(h * 60),
          fontSize: 11,
          color: '#94A3B8',
          transform: 'translateX(-50%)',
          userSelect: 'none',
        }}
      >
        {h <= 12 ? `${h}AM` : `${h - 12}PM`}
      </span>
    ))}
  </div>
)

export default function CoverageModal({ schedule, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 760,
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 24px 16px',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12, flexShrink: 0 }}>Weekly Coverage View</h3>

        {/* Sticky time ruler */}
        {TIME_RULER}

        {/* Scrollable day rows */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          {DAYS.map(({ key, label }) => (
            <DayRow key={key} label={label} entries={schedule[key]} />
          ))}
        </div>

        <div style={{ marginTop: 12, textAlign: 'right', flexShrink: 0 }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
