import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const DATA_DIR  = process.env.MC_DATA_DIR || join(ROOT, 'data');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || join(DATA_DIR, 'storage.db');
const db      = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

export function dbGet(key)        { return db.prepare('SELECT value FROM kv WHERE key = ?').get(key)?.value ?? null; }
export function dbSet(key, value) { db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)').run(key, String(value)); }
export function dbDelete(key)     { db.prepare('DELETE FROM kv WHERE key = ?').run(key); }
export function dbAll()           { return db.prepare('SELECT key, value FROM kv').all(); }
