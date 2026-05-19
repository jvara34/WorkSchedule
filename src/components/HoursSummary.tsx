import { formatHours } from '../utils'

type Props = {
  weeklyMinutes: Record<string, number>
}

const WARN_MINUTES = 20 * 60

export default function HoursSummary({ weeklyMinutes }: Props) {
  const workers = Object.entries(weeklyMinutes).sort((a, b) => a[0].localeCompare(b[0]))
  if (workers.length === 0) return null

  return (
    <div className="hours-summary">
      <h3 className="hours-summary-title">Weekly Hours</h3>
      <div className="hours-chips">
        {workers.map(([name, minutes]) => (
          <span
            key={name}
            className={`hours-chip${minutes >= WARN_MINUTES ? ' hours-chip-warn' : ''}`}
          >
            {name} — {formatHours(minutes)}
            {minutes >= WARN_MINUTES && ' !'}
          </span>
        ))}
      </div>
    </div>
  )
}
