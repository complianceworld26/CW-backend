import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { ensureSchema } from './db.js'
import authRoutes from './routes/auth.routes.js'

dotenv.config()

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing in backend/.env')
}

const app = express()
const PORT = Number(process.env.PORT || 5000)

/**
 * Comma-separated frontend origins (scheme + host + port). No trailing slashes.
 * Set CLIENT_URL and/or ALLOWED_ORIGINS on Render, e.g. https://complianceworld.in
 * (apex + www are auto-expanded for simple https hostnames like example.in).
 */
function parseClientOrigins() {
  const raw = [process.env.CLIENT_URL, process.env.ALLOWED_ORIGINS].filter(Boolean).join(',')
  const fallback = 'http://localhost:5173'
  const source = raw.trim() ? raw : fallback
  const base = source
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)

  const expanded = new Set(base)
  for (const u of base) {
    try {
      const { protocol, hostname } = new URL(u)
      if (protocol !== 'https:' || hostname === 'localhost') continue
      if (hostname.startsWith('www.')) {
        expanded.add(`${protocol}//${hostname.slice(4)}`)
      } else if (hostname.split('.').length === 2) {
        expanded.add(`${protocol}//www.${hostname}`)
      }
    } catch {
      /* ignore invalid URL */
    }
  }
  return [...expanded]
}

const allowedOrigins = parseClientOrigins()
console.info('[cors] allowed origins:', allowedOrigins.join(', '))
if (
  process.env.NODE_ENV === 'production' &&
  allowedOrigins.length === 1 &&
  allowedOrigins[0].includes('localhost')
) {
  console.warn(
    '[cors] Production is only allowing localhost. Set CLIENT_URL (or ALLOWED_ORIGINS) on Render to your real site, e.g. https://complianceworld.in — then redeploy.',
  )
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true)
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, origin)
      }
      console.warn('[cors] blocked Origin:', origin, '| allow-list:', allowedOrigins.join(', '))
      return callback(null, false)
    },
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ code: 'server/error', message: 'Internal server error.' })
})

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialize database schema:', error)
    process.exit(1)
  })
