import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { pool } from '../db.js'
import { optionalAuth } from '../middleware/auth.js'
import { clearAuthCookie, setAuthCookie, signToken } from '../utils/auth.js'
import { getFirebaseAdminAuth, isFirebaseAdminConfigured } from '../utils/firebaseAdmin.js'

const router = Router()

router.post('/signup', async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(req.body?.password ?? '')

  if (!name || !email || !password) {
    return res.status(400).json({ code: 'auth/invalid-input', message: 'All fields are required.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ code: 'auth/weak-password', message: 'Password must be 8+ characters.' })
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
  if (existing.rowCount) {
    return res.status(409).json({ code: 'auth/email-already-in-use', message: 'Email already in use.' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const result = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
    [name, email, passwordHash],
  )
  const user = result.rows[0]

  const token = signToken(user.id)
  setAuthCookie(res, token)

  return res.status(201).json({
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    },
  })
})

router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(req.body?.password ?? '')

  if (!email || !password) {
    return res.status(400).json({ code: 'auth/invalid-input', message: 'Email and password are required.' })
  }

  const result = await pool.query(
    'SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1',
    [email],
  )
  const user = result.rows[0]

  if (!user) {
    return res.status(401).json({ code: 'auth/invalid-credential', message: 'Invalid credentials.' })
  }
  if (!user.password_hash) {
    return res.status(401).json({
      code: 'auth/use-google-login',
      message: 'This account uses Google sign-in. Continue with Google.',
    })
  }

  const isMatch = await bcrypt.compare(password, user.password_hash)
  if (!isMatch) {
    return res.status(401).json({ code: 'auth/invalid-credential', message: 'Invalid credentials.' })
  }

  const token = signToken(user.id)
  setAuthCookie(res, token)

  return res.json({
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    },
  })
})

router.post('/firebase-login', async (req, res) => {
  if (!isFirebaseAdminConfigured()) {
    return res
      .status(500)
      .json({ code: 'auth/firebase-admin-not-configured', message: 'Firebase login is not configured.' })
  }

  const idToken = String(req.body?.idToken ?? '')
  if (!idToken) {
    return res.status(400).json({ code: 'auth/invalid-input', message: 'Firebase token is required.' })
  }

  let decoded
  try {
    const firebaseAuth = getFirebaseAdminAuth()
    decoded = await firebaseAuth.verifyIdToken(idToken)
  } catch {
    return res.status(401).json({ code: 'auth/invalid-credential', message: 'Invalid Firebase token.' })
  }

  const email = String(decoded.email ?? '')
    .trim()
    .toLowerCase()
  const name = String(decoded.name ?? '').trim() || email.split('@')[0] || 'User'
  const firebaseUid = String(decoded.uid)
  const avatarUrl = decoded.picture ? String(decoded.picture) : null
  const emailVerified = Boolean(decoded.email_verified)

  if (!email) {
    return res.status(400).json({ code: 'auth/invalid-email', message: 'Firebase account email is missing.' })
  }

  const upsert = await pool.query(
    `INSERT INTO users (name, email, password_hash, auth_provider, firebase_uid, avatar_url, email_verified, last_login_at)
     VALUES ($1, $2, NULL, 'google', $3, $4, $5, NOW())
     ON CONFLICT (email)
     DO UPDATE SET
       name = EXCLUDED.name,
       auth_provider = 'google',
       firebase_uid = EXCLUDED.firebase_uid,
       avatar_url = EXCLUDED.avatar_url,
       email_verified = EXCLUDED.email_verified,
       last_login_at = NOW()
     RETURNING id, name, email, auth_provider, firebase_uid, avatar_url, email_verified, created_at`,
    [name, email, firebaseUid, avatarUrl, emailVerified],
  )
  const user = upsert.rows[0]

  const token = signToken(user.id)
  setAuthCookie(res, token)

  return res.json({
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      authProvider: user.auth_provider,
      firebaseUid: user.firebase_uid,
      avatarUrl: user.avatar_url,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
    },
  })
})

router.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  return res.json({ ok: true })
})

router.get('/me', optionalAuth, (req, res) => {
  return res.json({ user: req.user })
})

export default router
