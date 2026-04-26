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

/**
 * Cross-site auth cookie (SPA on custom domain, API on Render) needs Secure + SameSite=None.
 * Render sets RENDER=true; NODE_ENV may be unset in some setups — treat Render as production for cookies.
 */
function useCrossSiteAuthCookie() {
  if (process.env.COOKIE_DEV_LAX === '1') return false
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    process.env.CROSS_SITE_COOKIES === '1'
  )
}

export function setAuthCookie(res, token) {
  const crossSite = useCrossSiteAuthCookie()
  res.cookie('cw_token', token, {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? 'none' : 'lax',
    maxAge: ONE_WEEK_MS,
    path: '/',
  })
}

export function clearAuthCookie(res) {
  const crossSite = useCrossSiteAuthCookie()
  res.clearCookie('cw_token', {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? 'none' : 'lax',
    path: '/',
  })
}
