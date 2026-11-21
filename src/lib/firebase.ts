import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const

const envValues: Record<(typeof requiredKeys)[number], string | undefined> = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
}

export const missingFirebaseVariables = requiredKeys.filter((key) => !envValues[key])

export const isFirebaseConfigured = missingFirebaseVariables.length === 0

let app: FirebaseApp | null = null
let auth: Auth | null = null
let firestore: Firestore | null = null
let googleProvider: GoogleAuthProvider | null = null

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    firestore = getFirestore(app)
    if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
    }
    googleProvider = new GoogleAuthProvider()
    googleProvider.setCustomParameters({ prompt: 'select_account' })
  } catch (error) {
    console.error('[firebase] Initialisation failed.', error)
    app = null
    auth = null
    firestore = null
    googleProvider = null
  }
}

const isFirestoreConfigured = Boolean(isFirebaseConfigured && firestore)

export { app, auth, firestore, googleProvider, isFirestoreConfigured }
