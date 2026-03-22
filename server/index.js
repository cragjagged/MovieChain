import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import {
  readConfig, updateConfig, getUpdateState,
  checkForUpdates, applyUpdate, startChecker,
  getCurrentVersion, getCurrentSha,
} from './updater.js';
import { dbGet, dbSet, dbDelete, dbAll } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');
const DATA_DIR   = join(ROOT, 'data');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const PORT = parseInt(process.env.PORT || '7879', 10);

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(join(ROOT, 'dist')));

// ── SSE registry ─────────────────────────────────────────────────────────────
const sseClients = new Set();

function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch { sseClients.delete(res); }
  }
}

// ── API ───────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/version', (_req, res) => {
  res.json({ version: getCurrentVersion(), sha: getCurrentSha() });
});

app.get('/api/update/config', async (_req, res) => {
  try { res.json(await readConfig()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/update/config', async (req, res) => {
  try { res.json(await updateConfig(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/update/status', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify(getUpdateState())}\n\n`);
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

app.post('/api/update/check', async (_req, res) => {
  try {
    const cfg    = await readConfig();
    const result = await checkForUpdates(cfg.updateChannel);
    res.json(result);
    if (result.available && getUpdateState().phase === 'idle') {
      broadcast({ ...getUpdateState(), phase: 'available', ...result });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/update/apply', async (_req, res) => {
  const phase = getUpdateState().phase;
  if (!['idle', 'available', 'error'].includes(phase)) {
    return res.status(409).json({ error: 'Update already in progress' });
  }
  const cfg = await readConfig();
  res.json({ ok: true });
  applyUpdate(cfg.updateChannel, broadcast);
});

// ── Storage API ───────────────────────────────────────────────────────────────
app.get('/api/storage/:key', (req, res) => {
  const value = dbGet(req.params.key);
  res.json({ value });
});

app.put('/api/storage/:key', (req, res) => {
  const { value } = req.body;
  if (typeof value !== 'string') return res.status(400).json({ error: 'value must be a string' });
  dbSet(req.params.key, value);
  res.json({ ok: true });
});

app.delete('/api/storage/:key', (req, res) => {
  dbDelete(req.params.key);
  res.json({ ok: true });
});

// Full dump — useful for backups and debugging
app.get('/api/storage', (_req, res) => {
  const rows = dbAll();
  const out  = {};
  for (const { key, value } of rows) out[key] = value;
  res.json(out);
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(join(ROOT, 'dist', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const server = createServer(app);
server.listen(PORT, () => {
  console.log(`[movie-chain] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[movie-chain] Version: ${getCurrentVersion()} (${getCurrentSha()})`);
});

startChecker(broadcast);
