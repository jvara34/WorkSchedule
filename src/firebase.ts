import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

// Local testing against the Firebase emulator suite:
//   firebase emulators:start --only auth,firestore --project demo-asua
//   VITE_USE_EMULATORS=1 npm run dev
const useEmulators = import.meta.env.DEV && !!import.meta.env.VITE_USE_EMULATORS

// Paste your project's config from Firebase console:
// Project settings → General → Your apps → Web app → SDK setup and configuration.
// This config is public by design (it identifies the project, it doesn't grant
// access) — Firestore security rules are what protect writes.
const firebaseConfig = useEmulators
  ? { apiKey: 'demo', authDomain: 'demo-asua.firebaseapp.com', projectId: 'demo-asua' }
  : {
      apiKey: 'AIzaSyA49RF0VOMqVEjAWgt9VJfHQTElyexVsKE',
      authDomain: 'peer-advisor-schedule.firebaseapp.com',
      projectId: 'peer-advisor-schedule',
      storageBucket: 'peer-advisor-schedule.firebasestorage.app',
      messagingSenderId: '242086370394',
      appId: '1:242086370394:web:98057aa0c45353e5794c63',
    }

export const isFirebaseConfigured = useEmulators || !firebaseConfig.apiKey.startsWith('PASTE')

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
