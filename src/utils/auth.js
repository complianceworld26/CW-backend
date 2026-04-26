import jwt from 'jsonwebtoken'

const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}

export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie('cw_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: ONE_WEEK_MS,
    path: '/',
  })
}

export function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === 'production'
  res.clearCookie('cw_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  })
}
