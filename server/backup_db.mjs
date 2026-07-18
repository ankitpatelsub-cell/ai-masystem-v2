// backup_db.mjs — daily SQLite backup via better-sqlite3 online backup API.
// Usage (cron): node server/backup_db.mjs   (DB_PATH from ../.env, like server.js)
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '..', '.env') });

const SRC = process.env.DB_PATH || path.join(here, '..', 'masystem.db');
const DIR = process.env.BACKUP_DIR || '/root/backups';
const KEEP = 14;

fs.mkdirSync(DIR, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const dest = path.join(DIR, `masystem-${stamp}.db`);

const db = new Database(SRC, { readonly: true });
await db.backup(dest);
db.close();

const backups = fs.readdirSync(DIR).filter(f => /^masystem-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
for (const f of backups.slice(0, Math.max(0, backups.length - KEEP))) fs.unlinkSync(path.join(DIR, f));

console.log(`backup ok: ${dest} (${fs.statSync(dest).size} bytes), kept ${Math.min(backups.length, KEEP)}`);
