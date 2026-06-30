import type { ShiftEntry } from '../types'
import ShiftCard from './ShiftCard'
import { shiftDuration, formatHours } from '../utils'

type Props = {
  day: string
  entries: ShiftEntry[]
  selectedWorkers: Set<string>
  isBoss: boolean
  onAdd: () => void
  onEdit: (entry: ShiftEntry) => void
  onDelete: (id: string) => void
}

export default function DayColumn({ day, entries, selectedWorkers, isBoss, onAdd, onEdit, onDelete }: Props) {
  const visibleEntries = selectedWorkers.size === 0
    ? entries
    : entries.filter(e => selectedWorkers.has(e.name))
  const morningCount = visibleEntries.filter(e => e.shiftType === 'morning' || e.shiftType === 'fullday').length
  const afternoonCount = visibleEntries.filter(e => e.shiftType === 'afternoon' || e.shiftType === 'fullday').length
  const totalMinutes = visibleEntries.reduce((sum, e) => sum + shiftDuration(e), 0)
  const totalPeople = new Set(visibleEntries.map(e => e.name)).size

  return (
    <div className="day-column">
      <div className="day-header">
        <h2>{day}</h2>
        <div className="shift-counts">
          <span className="count-chip total-chip">👥 {totalPeople}</span>
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
        {visibleEntries.length === 0 && (
          <div className="empty-msg">No shifts scheduled</div>
        )}
        {visibleEntries.map(entry => (
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
