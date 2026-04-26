import { pool } from '../db.js'
import { verifyToken } from '../utils/auth.js'

export async function requireAuth(req, res, next) {
  const token = req.cookies?.cw_token

  if (!token) {
    return res.status(401).json({ code: 'auth/unauthenticated', message: 'Login required.' })
  }

  try {
    const payload = verifyToken(token)
    const userId = Number(payload.sub)
    if (!Number.isInteger(userId)) {
      return res.status(401).json({ code: 'auth/invalid-token', message: 'Invalid session.' })
    }

    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1 LIMIT 1',
      [userId],
    )
    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({ code: 'auth/user-not-found', message: 'User not found.' })
    }

    req.user = {
      id: String(user.id),
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    }
    return next()
  } catch {
    return res.status(401).json({ code: 'auth/invalid-token', message: 'Invalid session.' })
  }
}
