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

/** Comma-separated list, e.g. http://localhost:5173,https://complianceworld.in,https://www.complianceworld.in */
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

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
