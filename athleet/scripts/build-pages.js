#!/usr/bin/env node
// Builds the static website for GitHub Pages into ./dist (same on Windows, macOS and Linux).
//
//   npm run build:pages     build only (what the deploy workflow runs)
//   npm run preview:pages   build, then serve it at http://localhost:8080/<repo-name>/
//                           exactly like GitHub Pages will
//
// The site lives under /<repo-name>/ on GitHub Pages. In CI the repo name comes from
// GITHUB_REPOSITORY; locally it falls back to this repo's name. Set EXPO_BASE_URL to
// override (for example "" when using a custom domain).

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const DEFAULT_REPO = 'devfest-2026-kickoff';
const repo = (process.env.GITHUB_REPOSITORY ?? '').split('/')[1] || DEFAULT_REPO;
const baseUrl = process.env.EXPO_BASE_URL ?? `/${repo}`;
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

console.log(`Building static site with base URL "${baseUrl || '/'}"…`);
const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--clear'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    EXPO_BASE_URL: baseUrl,
    NODE_ENV: 'production',
  },
});
if (result.status !== 0) process.exit(result.status ?? 1);

// GitHub Pages serves 404.html for unknown paths. Using the app shell lets the router
// show its own screen (or redirect) instead of GitHub's error page.
const notFound = path.join(dist, '+not-found.html');
fs.copyFileSync(fs.existsSync(notFound) ? notFound : path.join(dist, 'index.html'), path.join(dist, '404.html'));
// Expo writes files that start with "_" (e.g. /_expo/static); stop Jekyll from dropping them.
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('Done: dist/ is ready for GitHub Pages.');

if (process.argv.includes('--preview')) preview();

// Minimal static server that mimics GitHub Pages: /x → x, x.html or x/index.html, else 404.html.
function preview() {
  const port = Number(process.env.PORT) || 8080;
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.webp': 'image/webp' };
  http
    .createServer((req, res) => {
      let url = decodeURIComponent((req.url ?? '/').split('?')[0]);
      if (baseUrl && !url.startsWith(baseUrl)) {
        res.writeHead(302, { Location: `${baseUrl}/` });
        return res.end();
      }
      url = url.slice(baseUrl.length) || '/';
      const file = [url, `${url}.html`, path.join(url, 'index.html')]
        .map((p) => path.join(dist, p))
        .find((p) => p.startsWith(dist) && fs.existsSync(p) && fs.statSync(p).isFile());
      const target = file ?? path.join(dist, '404.html');
      res.writeHead(file ? 200 : 404, { 'Content-Type': types[path.extname(target)] ?? 'application/octet-stream' });
      fs.createReadStream(target).pipe(res);
    })
    .listen(port, () => console.log(`Preview: http://localhost:${port}${baseUrl}/`));
}
