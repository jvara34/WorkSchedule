import { useState, type KeyboardEvent } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../firebase'

type Props = {
  onSuccess: () => void
  onClose: () => void
}

// Firebase Auth accounts are keyed by email; the boss types a plain username,
// which maps to the synthetic account email created in the Firebase console.
const EMAIL_DOMAIN = 'asua-schedule.app'

function usernameToEmail(username: string): string {
  const u = username.trim().toLowerCase()
  return u.includes('@') ? u : `${u}@${EMAIL_DOMAIN}`
}

export default function LoginModal({ onSuccess, onClose }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (loading) return
    if (!isFirebaseConfigured) {
      setError('Backend is not configured yet — see src/firebase.ts.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, usernameToEmail(username), password)
      onSuccess()
    } catch {
      setError('Incorrect username or password.')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter') void handleSubmit()
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
          <button className="btn-primary" onClick={() => void handleSubmit()} disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  )
}
