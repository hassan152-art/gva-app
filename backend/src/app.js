import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import env from './config.js';
import authRoutes from './routes/auth.js';
import orphanRoutes, { getImpact } from './routes/orphans.js';
import paymentRoutes from './routes/payments.js';
import profileRoutes from './routes/profile.js';
import adminRoutes from './routes/admin.js';
import kafalatRoutes from './routes/kafalat.js';
import fopRoutes from './routes/fop.js';
import publicRoutes from './routes/public.js';
import whatsappRoutes from './routes/whatsapp.js';
import { requireAuth } from './lib/auth.js';

const app = express();

app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim()),
  })
);
app.use(express.json({ limit: '1mb' }));

// Legacy local proofs (pre-Cloudious). New uploads store a Drive URL in proof_path.
try {
  const uploadRoot = join(env.root, env.uploadDir);
  if (!existsSync(uploadRoot)) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(uploadRoot, { recursive: true });
  }
  app.use('/uploads', express.static(uploadRoot, { maxAge: '1h' }));
} catch (e) {
  // In serverless / read-only filesystem environments, ignore
}

const apiRouter = express.Router();
apiRouter.get('/health', (_req, res) => res.json({ ok: true, service: 'gva-backend' }));
apiRouter.use('/auth', authRoutes);
apiRouter.use('/public', publicRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/orphans', orphanRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/admin/kafalat', kafalatRoutes);
apiRouter.use('/admin/fop', fopRoutes);
apiRouter.use('/admin/whatsapp', whatsappRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.get('/me/impact', requireAuth, getImpact);

app.use('/api', apiRouter);
app.use('/', apiRouter);

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature.
app.use((err, _req, res, _next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : err.code === '42P01' ? 503 : 500);
  const message =
    err.code === 'LIMIT_FILE_SIZE'
      ? `That file is too large (max ${env.maxUploadMb} MB)`
      : err.code === '42P01'
        ? 'The database is not updated for this feature yet. Run the migrations (npm run migrate) and try again.'
        : err.message || 'Something went wrong';
  if (status >= 500) console.error('[api]', err);
  res.status(status).json({ error: message });
});

export default app;
