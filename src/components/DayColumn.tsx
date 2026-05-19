import type { ShiftEntry } from '../types'
import ShiftCard from './ShiftCard'
import { shiftDuration, formatHours } from '../utils'

type Props = {
  day: string
  entries: ShiftEntry[]
  isBoss: boolean
  onAdd: () => void
  onEdit: (entry: ShiftEntry) => void
  onDelete: (id: string) => void
}

export default function DayColumn({ day, entries, isBoss, onAdd, onEdit, onDelete }: Props) {
  const morningCount = entries.filter(e => e.shiftType === 'morning' || e.shiftType === 'fullday').length
  const afternoonCount = entries.filter(e => e.shiftType === 'afternoon' || e.shiftType === 'fullday').length
  const totalMinutes = entries.reduce((sum, e) => sum + shiftDuration(e), 0)

  return (
    <div className="day-column">
      <div className="day-header">
        <h2>{day}</h2>
        <div className="shift-counts">
          <span className="count-chip morning-chip">☀ Morning: {morningCount}</span>
          <span className="count-chip afternoon-chip">🌆 Afternoon: {afternoonCount}</span>
          {totalMinutes > 0 && (
            <span className="count-chip" style={{ background: '#F5F5F5', color: '#555' }}>
              ⏱ {formatHours(totalMinutes)}
            </span>
          )}
        </div>
      </div>
      <div className="day-body">
        {entries.length === 0 && (
          <div className="empty-msg">No shifts scheduled</div>
        )}
        {entries.map(entry => (
          <ShiftCard
            key={entry.id}
            entry={entry}
            isBoss={isBoss}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {isBoss && (
          <button className="add-btn" onClick={onAdd}>+ Add Worker</button>
        )}
      </div>
    </div>
  )
}
