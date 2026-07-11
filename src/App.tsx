import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { WeekSchedule, DayKey, ShiftEntry, Roster } from './types'
import DayColumn from './components/DayColumn'
import AddShiftModal from './components/AddShiftModal'
import RosterPanel from './components/RosterPanel'
import LoginModal from './components/LoginModal'
import CsvImportModal from './components/CsvImportModal'
import CoverageModal from './components/CoverageModal'
import HoursSummary from './components/HoursSummary'
import { workerWeeklyMinutes } from './utils'
import { auth } from './firebase'
import {
  EMPTY_SCHEDULE,
  loadCachedSchedule,
  loadCachedRoster,
  loadCachedLabel,
  writeCache,
  push,
  subscribe,
  sanitizeSchedule,
  sanitizeRoster,
  sanitizeLabel,
  scheduleHasShifts,
  type AppStateKey,
} from './persistence'
import './App.css'

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
]

export default function App() {
  const [scheduleA, setScheduleA] = useState<WeekSchedule>(() => loadCachedSchedule('schedule_a'))
  const [scheduleB, setScheduleB] = useState<WeekSchedule>(() => loadCachedSchedule('schedule_b'))
  const [labelA, setLabelA] = useState(() => loadCachedLabel('label_a', 'Current'))
  const [labelB, setLabelB] = useState(() => loadCachedLabel('label_b', 'Future'))
  const [activeTab, setActiveTab] = useState<'a' | 'b'>('a')
  const [editingLabel, setEditingLabel] = useState<'a' | 'b' | null>(null)
  const [labelDraft, setLabelDraft] = useState('')

  const [roster, setRoster] = useState<Roster>(loadCachedRoster)
  const [isBoss, setIsBoss] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'live' | 'offline'>('connecting')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [needsSeed, setNeedsSeed] = useState(false)
  const [modal, setModal] = useState<{ day: DayKey; editing: ShiftEntry | null } | null>(null)
  const [showRoster, setShowRoster] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [showCoverage, setShowCoverage] = useState(false)
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set())

  function toggleWorker(name: string) {
    setSelectedWorkers(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const activeSchedule = activeTab === 'a' ? scheduleA : scheduleB

  // isBoss mirrors the Firebase Auth session (persisted across reloads).
  useEffect(() => {
    return onAuthStateChanged(auth, user => setIsBoss(!!user))
  }, [])

  // Live sync: apply every server change to state and the localStorage cache.
  useEffect(() => {
    return subscribe({
      onChange: (key, value) => {
        switch (key) {
          case 'schedule_a': setScheduleA(sanitizeSchedule(value)); break
          case 'schedule_b': setScheduleB(sanitizeSchedule(value)); break
          case 'roster': setRoster(sanitizeRoster(value)); break
          case 'label_a': setLabelA(sanitizeLabel(value, 'Current')); break
          case 'label_b': setLabelB(sanitizeLabel(value, 'Future')); break
          default: return
        }
        writeCache(key, key === 'label_a' || key === 'label_b'
          ? sanitizeLabel(value, key === 'label_a' ? 'Current' : 'Future')
          : value)
      },
      onFirstSnapshot: values => {
        const serverEmpty = !scheduleHasShifts(sanitizeSchedule(values.schedule_a))
          && !scheduleHasShifts(sanitizeSchedule(values.schedule_b))
        const localHasData = scheduleHasShifts(loadCachedSchedule('schedule_a'))
          || scheduleHasShifts(loadCachedSchedule('schedule_b'))
        if (serverEmpty && localHasData) setNeedsSeed(true)
      },
      onStatus: setSyncStatus,
    })
  }, [])

  // One-time migration: offer to upload this device's pre-backend data.
  useEffect(() => {
    if (!needsSeed || !isBoss) return
    const timer = setTimeout(() => {
      setNeedsSeed(false)
      if (!window.confirm("The shared server is empty but this device has a saved schedule. Upload this device's schedule to the server so everyone can see it?")) return
      void pushToServer('schedule_a', scheduleA)
      void pushToServer('schedule_b', scheduleB)
      void pushToServer('roster', roster)
      void pushToServer('label_a', labelA)
      void pushToServer('label_b', labelB)
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsSeed, isBoss])

  async function pushToServer(key: AppStateKey, value: unknown) {
    const { error } = await push(key, value)
    setSaveError(error
      ? 'Save failed — this change is only on this device. Check your connection or log in again.'
      : null)
  }

  function saveScheduleA(next: WeekSchedule) {
    setScheduleA(next)
    writeCache('schedule_a', next)
    void pushToServer('schedule_a', next)
  }

  function saveScheduleB(next: WeekSchedule) {
    setScheduleB(next)
    writeCache('schedule_b', next)
    void pushToServer('schedule_b', next)
  }

  function saveActive(next: WeekSchedule) {
    if (activeTab === 'a') saveScheduleA(next)
    else saveScheduleB(next)
  }

  function saveRoster(next: Roster) {
    setRoster(next)
    writeCache('roster', next)
    void pushToServer('roster', next)
  }

  function saveLabelA(val: string) {
    setLabelA(val)
    writeCache('label_a', val)
    void pushToServer('label_a', val)
  }

  function saveLabelB(val: string) {
    setLabelB(val)
    writeCache('label_b', val)
    void pushToServer('label_b', val)
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
          <span className={`sync-badge sync-${syncStatus}`}>
            {syncStatus === 'live' ? 'Live' : syncStatus === 'connecting' ? 'Connecting…' : 'Offline'}
          </span>
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
              <button className="btn-secondary" onClick={() => void signOut(auth)}>
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

      {saveError && <div className="sync-error-banner">{saveError}</div>}

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

      {roster.length > 0 && (
        <div className="worker-filter-bar">
          {roster.map(name => {
            let chipClass = 'worker-chip-neutral'
            if (selectedWorkers.size > 0) {
              chipClass = selectedWorkers.has(name) ? 'worker-chip-active' : 'worker-chip-inactive'
            }
            return (
              <button
                key={name}
                className={`worker-chip ${chipClass}`}
                onClick={() => toggleWorker(name)}
              >
                {name}
              </button>
            )
          })}
        </div>
      )}

      <main className="schedule-grid">
        {DAYS.map(({ key, label }) => (
          <DayColumn
            key={key}
            day={label}
            entries={activeSchedule[key]}
            selectedWorkers={selectedWorkers}
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
          onSuccess={() => setShowLogin(false)}
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
