import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const DATA_DIR  = join(ROOT, 'data');

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

const _get = db.prepare('SELECT value FROM kv WHERE key = ?');
const _set = db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)');
const _del = db.prepare('DELETE FROM kv WHERE key = ?');
const _all = db.prepare('SELECT key, value FROM kv');

export function dbGet(key)        { return _get.get(key)?.value ?? null; }
export function dbSet(key, value) { _set.run(key, String(value)); }
export function dbDelete(key)     { _del.run(key); }
export function dbAll()           { return _all.all(); }
