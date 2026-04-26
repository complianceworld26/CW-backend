import { pool } from '../db.js'
import { verifyToken } from '../utils/auth.js'

async function getUserFromCookieToken(token) {
  if (!token) return null

  try {
    const payload = verifyToken(token)
    const userId = Number(payload.sub)
    if (!Number.isInteger(userId)) return null

    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1 LIMIT 1',
      [userId],
    )
    const user = result.rows[0]
    if (!user) return null

    return {
      id: String(user.id),
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    }
  } catch {
    return null
  }
}

/** Sets req.user or null; never sends 401 (for GET /me). */
export async function optionalAuth(req, _res, next) {
  req.user = await getUserFromCookieToken(req.cookies?.cw_token)
  next()
}

export async function requireAuth(req, res, next) {
  const user = await getUserFromCookieToken(req.cookies?.cw_token)

  if (!user) {
    return res.status(401).json({ code: 'auth/unauthenticated', message: 'Login required.' })
  }

  req.user = user
  return next()
}
