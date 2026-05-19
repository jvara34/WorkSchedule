import { useState, type KeyboardEvent } from 'react'

type Props = {
  onSuccess: () => void
  onClose: () => void
}

const BOSS_USER = 'Andrew'
const BOSS_PASS = 'Julianisthebest'

export default function LoginModal({ onSuccess, onClose }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    if (username === BOSS_USER && password === BOSS_PASS) {
      onSuccess()
    } else {
      setError('Incorrect username or password.')
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Boss Login</h2>
        <label className="form-label">Username</label>
        <input
          className="form-input"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={handleKey}
          autoFocus
        />
        <label className="form-label" style={{ marginTop: 10 }}>Password</label>
        <input
          className="form-input"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKey}
        />
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>Login</button>
        </div>
      </div>
    </div>
  )
}
