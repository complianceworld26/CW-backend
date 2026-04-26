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
 * Comma-separated list, e.g. http://localhost:5173,https://complianceworld.in
 * Trailing slashes are stripped. For simple https hostnames (e.g. x.y TLD), both apex and www are allowed.
 */
function parseClientOrigins() {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173'
  const base = raw
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

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true)
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, origin)
      }
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
