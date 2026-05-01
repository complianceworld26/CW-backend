# Backend (Neon + Custom Auth)

## Setup

1. Copy `.env.example` to `.env`.
2. Put your Neon connection string in `DATABASE_URL`.
3. Set a strong `JWT_SECRET`.
4. For contact / order forms: set `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, and `EMAILJS_PUBLIC_KEY` (same values as in the EmailJS dashboard). The frontend calls `POST /api/contact` on this server first.  
   **EmailJS → Account → Security:** turn on **Allow non-browser applications** (or API calls from Node will fail with “non-browser environments is currently disabled”). If that stays off, the app falls back to sending from the browser (needs `VITE_EMAILJS_*` on the client).
5. Install deps and start:

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

## Contact API

- `POST /api/contact` body: `{ "name", "email", "message", "phone"?, "subject"?, "source"? }`  
  Forwards to EmailJS using the env vars above. `source` is typically `contact` or `order`.
