# Athleet accounts server

Username + password accounts and data sync for the Athleet app. No email or phone number is ever collected. A one-time recovery code replaces "forgot password" emails.

Plain Node with no dependencies: `node:http` and `node:crypto` (scrypt). Data lives in [Turso](https://turso.tech) (hosted SQLite, free tier) in production, or a local SQLite file (`node:sqlite`) in development. Needs **Node 22.13+**.

```bash
cd server
npm start          # http://localhost:8787
npm test           # full suite on local SQLite and on a stand-in for Turso
```

## Configuration

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `8787` | Port to listen on. Render sets this for you. |
| `TURSO_DATABASE_URL` | none | Hosted database (`libsql://…`). Required on free hosts, which wipe local files on every restart. |
| `TURSO_AUTH_TOKEN` | none | Token for that database. |
| `DATABASE_PATH` | `data/athleet.db` | Local SQLite file, used when Turso isn't set. |
| `ALLOWED_ORIGINS` | `http://localhost:8081,…` | Comma-separated web origins allowed to call the API, e.g. `https://you.github.io`: scheme and host only, without the `/repo-name` path. The phone apps don't need an entry. |
| `TRUST_PROXY` | off | Set to `1` behind a proxy such as Render's, so rate limits use the real client address. |

The app finds the server through `EXPO_PUBLIC_ACCOUNTS_URL`:

- **Local development:** `athleet/.env`.
- **GitHub Pages:** a repository variable. See step 3 below.

Without it, the app hides account features and keeps everything on the device.

## Free hosting: Render + Turso

Both have free plans that don't need a card. Render runs the server; Turso keeps the data, because Render's free disk is wiped on every restart.

**1. Database (Turso)**

1. Sign up at [turso.tech](https://turso.tech).
2. Create a database, for example `athleet`, in the region closest to your Render region.
3. Copy its URL (`libsql://athleet-<you>.turso.io`).
4. Create a database token. With the CLI: `turso db show athleet --url` and `turso db tokens create athleet`.

The server creates its tables on first start.

**2. Server (Render)**

1. Push this repo to GitHub, then sign up at [render.com](https://render.com).
2. Choose New → Blueprint and select the repo and branch. Render reads [`render.yaml`](../render.yaml).
3. Paste `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` when asked.
4. Check `ALLOWED_ORIGINS` in `render.yaml` matches your Pages origin.
5. When it's live, open `https://<service>.onrender.com/api/health`. It should return `{"ok":true}`.

**3. App**

1. In GitHub, go to repo Settings → Secrets and variables → Actions → Variables and add `EXPO_PUBLIC_ACCOUNTS_URL` = `https://<service>.onrender.com`.
2. The next Pages deploy (a push to `main`) shows the account features.
3. For local development, put the same line in `athleet/.env`.

**Free-plan limits to know about**

- **Sleeping:** Render sleeps after 15 idle minutes, and the next request takes about a minute while it wakes. The app tells users when sign-in is slow for this reason.
- **Rate limits reset:** the counters live in memory, so they reset when the server sleeps.
- **Monthly hours:** 750 free instance hours a month, enough for one always-on service.
- **Turso free plan:** 5 GB of storage and 10 million row writes a month, far more than this app needs.

Turso keeps your data across restarts and offers point-in-time restore. For extra safety, export a copy now and then with `turso db shell athleet .dump > backup.sql`.

**Other hosts:** any host that runs Node works. With a persistent disk (a paid Render plan, Fly.io volumes, a VPS) you can skip Turso and set `DATABASE_PATH` to a file on that disk. Serve over **HTTPS** either way. If you run several instances, move the in-memory rate limiter (`src/rate-limit.js`) to a shared store.

## How it works

- **Passwords and recovery codes:** stored only as scrypt hashes (N=2^15, r=8, p=1, random salt).
- **Sessions:** random 256-bit bearer tokens; the server stores only their SHA-256. They expire after 30 days without use, and users can see and revoke them from Settings.
- **Changing a password:** signs out every other device.
- **Using a recovery code:** resets the password, signs out everywhere and issues a new code.
- **Rate limits:**
  - wrong passwords: 5 per username per 15 minutes
  - logins: 30 per network per 15 minutes
  - sign-ups: 5 per network per hour
  - recovery attempts: 5 per username per hour
  - password checks on settings changes: 10 per user per 15 minutes
- **Login errors:** a wrong username and a wrong password get the same message and take the same time.
- **Sync:** stores six keys per user (profile, selectedPlan, workoutLogs, appearance, dietary, budget), last write wins per key, 2 MB per user. The app merges workout history so no device loses a workout.

## API

All routes are under `/api` and return JSON. Signed-in routes need the header `Authorization: Bearer <token>`.

| Route | Body | Returns |
|---|---|---|
| `POST /auth/signup` | `username, password, displayName?` | `user, token, sessionId, recoveryCode` |
| `POST /auth/login` | `username, password` | `user, token, sessionId` |
| `POST /auth/recover` | `username, recoveryCode, newPassword` | `user, token, sessionId, recoveryCode` |
| `POST /auth/logout` | | 204 |
| `GET /account` | | `user, sessionId` |
| `PATCH /account` | `displayName` | `user` |
| `POST /account/username` | `username, password` | `user` |
| `POST /account/password` | `currentPassword, newPassword` | `user` |
| `POST /account/recovery-code` | `password` | `recoveryCode` |
| `GET /account/sessions` | | `sessions[]` |
| `DELETE /account/sessions/:id` | | 204 |
| `POST /account/sessions/revoke-others` | | `revoked` |
| `GET /account/export` | | everything stored for the account |
| `DELETE /account` | `password, confirm` (the username) | 204 |
| `GET /sync` | | `data: { key: { value, updatedAt } }` |
| `PUT /sync` | `changes: { key: { value, updatedAt } }` | `data` |
