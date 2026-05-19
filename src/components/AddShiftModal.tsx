import { useState, useEffect } from 'react'
import type { ShiftEntry, Roster } from '../types'
import { classifyShift } from '../utils'
import { nanoid } from 'nanoid'

type Props = {
  day: string
  roster: Roster
  editing: ShiftEntry | null
  onSave: (entry: ShiftEntry) => void
  onClose: () => void
}

export default function AddShiftModal({ day, roster, editing, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [customName, setCustomName] = useState('')
  const [startTime, setStartTime] = useState('08:30')
  const [endTime, setEndTime] = useState('12:30')
  const [hasLunch, setHasLunch] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) {
      setName(roster.includes(editing.name) ? editing.name : '__custom__')
      setCustomName(roster.includes(editing.name) ? '' : editing.name)
      setStartTime(editing.startTime)
      setEndTime(editing.endTime)
      setHasLunch(editing.hasLunch ?? false)
    }
  }, [editing, roster])

  const resolvedName = name === '__custom__' ? customName.trim() : name.trim()

  function handleSave() {
    if (!resolvedName) { setError('Please enter a worker name.'); return }
    if (!startTime || !endTime) { setError('Please set start and end times.'); return }
    if (startTime >= endTime) { setError('End time must be after start time.'); return }
    setError('')
    onSave({
      id: editing?.id ?? nanoid(),
      name: resolvedName,
      startTime,
      endTime,
      shiftType: classifyShift(startTime, endTime),
      hasLunch,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{editing ? 'Edit Shift' : `Add Shift — ${day}`}</h3>
        <label className="field-label">Worker</label>
        <select value={name} onChange={e => setName(e.target.value)} className="field-input">
          <option value="">— Select —</option>
          {roster.map(n => <option key={n} value={n}>{n}</option>)}
          <option value="__custom__">Other (type name)</option>
        </select>
        {name === '__custom__' && (
          <input
            className="field-input"
            style={{ marginTop: 6 }}
            placeholder="Worker name"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
          />
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="field-label">Start Time</label>
            <input type="time" className="field-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label">End Time</label>
            <input type="time" className="field-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={hasLunch}
            onChange={e => setHasLunch(e.target.checked)}
          />
          Lunch break (−30 min)
        </label>
        {error && <div className="error-msg">{error}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
