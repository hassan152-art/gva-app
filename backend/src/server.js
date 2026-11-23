import app from './app.js';
import env from './config.js';
import { pool } from './db/index.js';

const listenHost = process.env.HOST || (env.nodeEnv === 'development' ? '0.0.0.0' : '127.0.0.1');
const server = app.listen(env.port, listenHost, () => {
  console.log(`[api] listening on http://${listenHost}:${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal) {
  console.log(`[api] ${signal} — shutting down`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  // Do not hang forever on stuck sockets.
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
