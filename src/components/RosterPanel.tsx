import { useState } from 'react'
import type { Roster } from '../types'

type Props = {
  roster: Roster
  onUpdate: (roster: Roster) => void
  onClose: () => void
}

export default function RosterPanel({ roster, onUpdate, onClose }: Props) {
  const [input, setInput] = useState('')

  function add() {
    const name = input.trim()
    if (!name || roster.includes(name)) { setInput(''); return }
    onUpdate([...roster, name])
    setInput('')
  }

  function remove(name: string) {
    onUpdate(roster.filter(n => n !== name))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Manage Worker Roster</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="field-input"
            placeholder="Add worker name"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={add}>Add</button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 280, overflowY: 'auto' }}>
          {roster.length === 0 && <li style={{ color: '#888', fontSize: 14 }}>No workers yet.</li>}
          {roster.map(name => (
            <li key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ fontSize: 14 }}>{name}</span>
              <button className="icon-btn danger" onClick={() => remove(name)} title="Remove">✕</button>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
