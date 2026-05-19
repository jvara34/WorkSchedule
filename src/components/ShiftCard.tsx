import type { ShiftEntry } from '../types'
import { formatTime, shiftDuration, formatHours } from '../utils'

const COLORS: Record<ShiftEntry['shiftType'], { bg: string; border: string; label: string }> = {
  morning: { bg: '#EFF6FF', border: '#3B82F6', label: 'Morning' },
  afternoon: { bg: '#FFF7ED', border: '#F97316', label: 'Afternoon' },
  fullday: { bg: '#F0FDF4', border: '#22C55E', label: 'Full Day' },
}

type Props = {
  entry: ShiftEntry
  isBoss: boolean
  onEdit: (entry: ShiftEntry) => void
  onDelete: (id: string) => void
}

export default function ShiftCard({ entry, isBoss, onEdit, onDelete }: Props) {
  const c = COLORS[entry.shiftType]
  return (
    <div
      style={{
        background: c.bg,
        borderLeft: `4px solid ${c.border}`,
        borderRadius: 6,
        padding: '8px 10px',
        marginBottom: 6,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.name}</div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
          {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
          <span style={{ marginLeft: 6, color: '#888' }}>({formatHours(shiftDuration(entry))})</span>
          {entry.hasLunch && <span style={{ marginLeft: 6, color: '#94A3B8', fontSize: 11 }}>incl. lunch</span>}
        </div>
        <div style={{ fontSize: 11, color: c.border, marginTop: 2, fontWeight: 500 }}>
          {c.label}
        </div>
      </div>
      {isBoss && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="icon-btn" onClick={() => onEdit(entry)} title="Edit">Edit</button>
          <button className="icon-btn danger" onClick={() => onDelete(entry.id)} title="Delete">Del</button>
        </div>
      )}
    </div>
  )
}
