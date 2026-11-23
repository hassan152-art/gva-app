import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// backend/src/config.js -> backend/
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const projectRoot = dirname(root);
const workspaceRoot = dirname(projectRoot);

// Load the single unified .env from wherever it is located
for (const dir of [root, projectRoot, workspaceRoot]) {
  dotenv.config({ path: join(dir, '.env'), quiet: true });
}

const bool = (v, d = false) => (v === undefined ? d : String(v).toLowerCase() === 'true');

const env = {
  root,
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  pg: {
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'gva',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
  },
  pgssl: bool(process.env.PGSSL) || (Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL.includes('sslmode=require')),
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? 'gva-prod-fallback-jwt-secret-key-2026' : 'dev-only-insecure-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 5),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  cloudious: (() => {
    const apiKey = process.env.CLOUDIOUS_API_KEY || '';
    const nodeEnv = process.env.NODE_ENV || 'development';
    const devStubExplicit = process.env.CLOUDIOUS_DEV_STUB;
    const devStub =
      nodeEnv !== 'production' &&
      (bool(devStubExplicit) || (!apiKey && devStubExplicit !== 'false'));
    if (nodeEnv === 'production' && !apiKey) {
      console.warn('[config] CLOUDIOUS_API_KEY is missing — payment proof uploads will fail');
    }
    return {
      uploadUrl: process.env.CLOUDIOUS_UPLOAD_URL || 'https://gdrive.cloudious.net/upload',
      apiKey,
      timeoutMs: Number(process.env.CLOUDIOUS_UPLOAD_TIMEOUT_MS || 120000),
      devStub,
    };
  })(),
};

if (env.nodeEnv === 'production' && !process.env.JWT_SECRET) {
  console.warn('[config] Warning: JWT_SECRET environment variable not explicitly set, using production fallback.');
}

export default env;
