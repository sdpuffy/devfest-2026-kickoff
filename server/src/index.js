import { createApp } from './app.js';

// Start the Athleet accounts server. Configure with environment variables:
//   PORT                port to listen on (default 8787; Render sets this for you)
//   TURSO_DATABASE_URL  hosted database (libsql://… or https://…). Use this on free hosts,
//   TURSO_AUTH_TOKEN    which wipe local files on every restart.
//   DATABASE_PATH       local SQLite file when Turso isn't set (default ./data/athleet.db)
//   ALLOWED_ORIGINS     comma-separated web origins allowed to call the API, e.g.
//                       https://you.github.io,http://localhost:8081
//   TRUST_PROXY=1       use X-Forwarded-For for rate limits (only behind a proxy you control)

const port = Number(process.env.PORT ?? 8787);
const tursoUrl = process.env.TURSO_DATABASE_URL;
if (tursoUrl && !process.env.TURSO_AUTH_TOKEN) {
  console.error('TURSO_AUTH_TOKEN is missing. Create one with: turso db tokens create <database>');
  process.exit(1);
}

const server = await createApp({
  dbPath: process.env.DATABASE_PATH ?? 'data/athleet.db',
  tursoUrl,
  tursoToken: process.env.TURSO_AUTH_TOKEN,
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:8081,http://localhost:8080,http://localhost:19006')
    .split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === '1',
});

server.listen(port, () => console.log(`Athleet accounts server on port ${port} (storage: ${server.storage})`));

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
