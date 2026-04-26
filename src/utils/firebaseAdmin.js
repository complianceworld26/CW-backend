import admin from 'firebase-admin'

let initialized = false

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY
  if (!raw) return null
  return raw.replace(/\\n/g, '\n')
}

export function isFirebaseAdminConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && getPrivateKey())
}

export function getFirebaseAdminAuth() {
  if (!isFirebaseAdminConfigured()) {
    const err = new Error('Firebase Admin credentials are missing in backend/.env')
    err.code = 'auth/firebase-admin-not-configured'
    throw err
  }

  if (!initialized) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: getPrivateKey(),
      }),
    })
    initialized = true
  }

  return admin.auth()
}
