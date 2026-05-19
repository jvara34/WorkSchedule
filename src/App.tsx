import { useState } from 'react'
import type { WeekSchedule, DayKey, ShiftEntry, Roster } from './types'
import DayColumn from './components/DayColumn'
import AddShiftModal from './components/AddShiftModal'
import RosterPanel from './components/RosterPanel'
import LoginModal from './components/LoginModal'
import CsvImportModal from './components/CsvImportModal'
import CoverageModal from './components/CoverageModal'
import HoursSummary from './components/HoursSummary'
import { workerWeeklyMinutes } from './utils'
import './App.css'

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
]

const EMPTY_SCHEDULE: WeekSchedule = {
  monday: [], tuesday: [], wednesday: [], thursday: [], friday: [],
}

function loadSchedule(): WeekSchedule {
  try {
    const raw = localStorage.getItem('asua_schedule')
    return raw ? JSON.parse(raw) : EMPTY_SCHEDULE
  } catch { return EMPTY_SCHEDULE }
}

function loadScheduleB(): WeekSchedule {
  try {
    const raw = localStorage.getItem('asua_schedule_b')
    return raw ? JSON.parse(raw) : EMPTY_SCHEDULE
  } catch { return EMPTY_SCHEDULE }
}

function loadRoster(): Roster {
  try {
    const raw = localStorage.getItem('asua_roster')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function loadLabel(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback
}

export default function App() {
  const [scheduleA, setScheduleA] = useState<WeekSchedule>(loadSchedule)
  const [scheduleB, setScheduleB] = useState<WeekSchedule>(loadScheduleB)
  const [labelA, setLabelA] = useState(() => loadLabel('asua_label_a', 'Current'))
  const [labelB, setLabelB] = useState(() => loadLabel('asua_label_b', 'Future'))
  const [activeTab, setActiveTab] = useState<'a' | 'b'>('a')
  const [editingLabel, setEditingLabel] = useState<'a' | 'b' | null>(null)
  const [labelDraft, setLabelDraft] = useState('')

  const [roster, setRoster] = useState<Roster>(loadRoster)
  const [isBoss, setIsBoss] = useState(false)
  const [modal, setModal] = useState<{ day: DayKey; editing: ShiftEntry | null } | null>(null)
  const [showRoster, setShowRoster] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [showCoverage, setShowCoverage] = useState(false)

  const activeSchedule = activeTab === 'a' ? scheduleA : scheduleB

  function saveScheduleA(next: WeekSchedule) {
    setScheduleA(next)
    localStorage.setItem('asua_schedule', JSON.stringify(next))
  }

  function saveScheduleB(next: WeekSchedule) {
    setScheduleB(next)
    localStorage.setItem('asua_schedule_b', JSON.stringify(next))
  }

  function saveActive(next: WeekSchedule) {
    activeTab === 'a' ? saveScheduleA(next) : saveScheduleB(next)
  }

  function saveRoster(next: Roster) {
    setRoster(next)
    localStorage.setItem('asua_roster', JSON.stringify(next))
  }

  function saveLabelA(val: string) {
    setLabelA(val)
    localStorage.setItem('asua_label_a', val)
  }

  function saveLabelB(val: string) {
    setLabelB(val)
    localStorage.setItem('asua_label_b', val)
  }

  function startEditLabel(tab: 'a' | 'b') {
    setEditingLabel(tab)
    setLabelDraft(tab === 'a' ? labelA : labelB)
  }

  function commitLabel() {
    const val = labelDraft.trim() || (editingLabel === 'a' ? 'Current' : 'Future')
    if (editingLabel === 'a') saveLabelA(val)
    else if (editingLabel === 'b') saveLabelB(val)
    setEditingLabel(null)
  }

  function handleSaveShift(entry: ShiftEntry) {
    if (!modal) return
    const day = modal.day
    const existing = activeSchedule[day]
    const next = modal.editing
      ? existing.map(e => e.id === entry.id ? entry : e)
      : [...existing, entry]
    saveActive({ ...activeSchedule, [day]: next })
    setModal(null)
  }

  function handleDelete(day: DayKey, id: string) {
    saveActive({ ...activeSchedule, [day]: activeSchedule[day].filter(e => e.id !== id) })
  }

  function handleRosterUpdate(next: Roster) {
    saveRoster(next)
    const removed = roster.filter(name => !next.includes(name))
    if (removed.length === 0) return
    const purgeFrom = (sched: WeekSchedule): WeekSchedule => {
      const purged = { ...EMPTY_SCHEDULE }
      for (const key of Object.keys(purged) as DayKey[]) {
        purged[key] = sched[key].filter(e => !removed.includes(e.name))
      }
      return purged
    }
    saveScheduleA(purgeFrom(scheduleA))
    saveScheduleB(purgeFrom(scheduleB))
  }

  function handleClearSchedule() {
    const label = activeTab === 'a' ? labelA : labelB
    if (!window.confirm(`Clear the entire "${label}" schedule? This cannot be undone.`)) return
    saveActive(EMPTY_SCHEDULE)
  }

  function handleCsvImport(imported: WeekSchedule) {
    const merged: WeekSchedule = { ...EMPTY_SCHEDULE }
    for (const key of Object.keys(merged) as DayKey[]) {
      merged[key] = [...activeSchedule[key], ...imported[key]]
    }
    saveActive(merged)

    const importedNames = Array.from(new Set(
      (Object.values(imported) as ShiftEntry[][]).flat().map(e => e.name).filter(Boolean)
    ))
    const newRoster = [...roster]
    for (const name of importedNames) {
      if (!newRoster.includes(name)) newRoster.push(name)
    }
    if (newRoster.length !== roster.length) saveRoster(newRoster)
  }

  const weeklyMinutes = workerWeeklyMinutes(activeSchedule)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Peer Advisors Work Schedule</h1>
          <span className="subtitle">Mon – Fri Weekly View</span>
        </div>
        <div className="header-right">
          {isBoss && (
            <>
              <button className="btn-secondary" onClick={() => setShowCsvImport(true)}>
                Import CSV
              </button>
              <button className="btn-secondary" onClick={() => setShowCoverage(true)}>
                Coverage View
              </button>
              <button className="btn-secondary" onClick={() => window.print()}>
                Print
              </button>
              <button className="btn-danger" onClick={handleClearSchedule}>
                Clear Schedule
              </button>
              <button className="btn-secondary" onClick={() => setShowRoster(true)}>
                Manage Roster
              </button>
              <button className="btn-secondary" onClick={() => setIsBoss(false)}>
                Logout
              </button>
            </>
          )}
          {!isBoss && (
            <button className="btn-primary" onClick={() => setShowLogin(true)}>
              Boss Login
            </button>
          )}
        </div>
      </header>

      {/* Schedule tabs */}
      <div className="schedule-tabs">
        {(['a', 'b'] as const).map(tab => {
          const label = tab === 'a' ? labelA : labelB
          const isActive = activeTab === tab
          const isEditing = editingLabel === tab
          return (
            <div
              key={tab}
              className={`schedule-tab${isActive ? ' schedule-tab-active' : ''}`}
              onClick={() => { setActiveTab(tab); setEditingLabel(null) }}
            >
              {isBoss && isActive && isEditing ? (
                <input
                  className="tab-label-input"
                  autoFocus
                  value={labelDraft}
                  onChange={e => setLabelDraft(e.target.value)}
                  onBlur={commitLabel}
                  onKeyDown={e => { if (e.key === 'Enter') commitLabel(); if (e.key === 'Escape') setEditingLabel(null) }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span
                  className={isBoss && isActive ? 'tab-label-editable' : ''}
                  title={isBoss && isActive ? 'Click to rename' : undefined}
                  onClick={e => { if (isBoss && isActive) { e.stopPropagation(); startEditLabel(tab) } }}
                >
                  {label}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="legend">
        <span className="legend-item morning-chip">Morning (8:30 AM – 1:30 PM)</span>
        <span className="legend-item afternoon-chip">Afternoon (1:30 PM – 4:30 PM)</span>
        <span className="legend-item fullday-chip">Full Day</span>
      </div>

      <main className="schedule-grid">
        {DAYS.map(({ key, label }) => (
          <DayColumn
            key={key}
            day={label}
            entries={activeSchedule[key]}
            isBoss={isBoss}
            onAdd={() => setModal({ day: key, editing: null })}
            onEdit={entry => setModal({ day: key, editing: entry })}
            onDelete={id => handleDelete(key, id)}
          />
        ))}
      </main>

      <HoursSummary weeklyMinutes={weeklyMinutes} />

      {showLogin && (
        <LoginModal
          onSuccess={() => { setIsBoss(true); setShowLogin(false) }}
          onClose={() => setShowLogin(false)}
        />
      )}

      {showCsvImport && (
        <CsvImportModal
          onImport={handleCsvImport}
          onClose={() => setShowCsvImport(false)}
        />
      )}

      {modal && (
        <AddShiftModal
          day={DAYS.find(d => d.key === modal.day)!.label}
          roster={roster}
          editing={modal.editing}
          onSave={handleSaveShift}
          onClose={() => setModal(null)}
        />
      )}

      {showCoverage && (
        <CoverageModal
          schedule={activeSchedule}
          onClose={() => setShowCoverage(false)}
        />
      )}

      {showRoster && (
        <RosterPanel
          roster={roster}
          onUpdate={handleRosterUpdate}
          onClose={() => setShowRoster(false)}
        />
      )}
    </div>
  )
}
