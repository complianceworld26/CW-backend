# Backend (Neon + Custom Auth)

## Setup

1. Copy `.env.example` to `.env`.
2. Put your Neon connection string in `DATABASE_URL`.
3. Set a strong `JWT_SECRET`.
4. Add Firebase Admin credentials for Google login:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (with `\n` escaped newlines)
5. Install deps and start:

```bash
npm install
npm run dev
```

Server runs on `http://localhost:5000` by default.

## Auth API

- `POST /api/auth/signup` body: `{ "name", "email", "password" }`
- `POST /api/auth/login` body: `{ "email", "password" }`
- `POST /api/auth/firebase-login` body: `{ "idToken" }`
- `GET /api/auth/me` (requires auth cookie)
- `POST /api/auth/logout`

Auth is cookie-based (`cw_token`, httpOnly).  
Google/Firebase logins are verified server-side and saved in `users` with provider details.
