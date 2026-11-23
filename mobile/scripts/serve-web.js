/**
 * Static server for the exported web build.
 *
 * The parity harness screenshots routes like /sign-in, so this needs SPA-style
 * fallback: any path without an extension serves its own index.html when the
 * export produced one, otherwise the root index.html.
 *
 *   node scripts/serve-web.js [port]
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const port = Number(process.argv[2] || process.env.PORT || 8081);
const root = join(process.cwd(), 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

if (!existsSync(root)) {
  console.error(`[serve] no build at ${root} — run "npm run export:web" first`);
  process.exit(1);
}

function safePath(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  return join(root, clean);
}

const server = createServer((req, res) => {
  const urlPath = req.url || '/';
  let target = safePath(urlPath);

  if (existsSync(target) && statSync(target).isDirectory()) {
    target = join(target, 'index.html');
  }
  // Route-specific index.html from the static export, else the root one.
  if (!existsSync(target) && !extname(target)) {
    const routeIndex = join(safePath(urlPath), 'index.html');
    target = existsSync(routeIndex) ? routeIndex : join(root, 'index.html');
  }
  if (!existsSync(target)) {
    target = join(root, 'index.html');
  }

  const type = MIME[extname(target).toLowerCase()] || 'application/octet-stream';
  const body = readFileSync(target);
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[serve] http://127.0.0.1:${port} serving ${root}`);
});
