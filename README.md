# Backend (Neon + Custom Auth)

## Setup

1. Copy `.env.example` to `.env`.
2. Put your Neon connection string in `DATABASE_URL`.
3. Set a strong `JWT_SECRET`.
4. Install deps and start:

```bash
npm install
npm run dev
```

Server runs on `http://localhost:5000` by default.

## Auth API

- `POST /api/auth/signup` body: `{ "name", "email", "password" }`
- `POST /api/auth/login` body: `{ "email", "password" }`
- `GET /api/auth/me` (requires auth cookie)
- `POST /api/auth/logout`

Auth is cookie-based (`cw_token`, httpOnly).
