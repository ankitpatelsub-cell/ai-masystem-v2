// db.js — ONE shared SQLite database for the entire AI MASystem.
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
import Database from 'better-sqlite3';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'masystem.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---- Users & auth (multi-user) ----
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',   -- admin | staff | viewer
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

// ---- Shared lead pipeline (biz-site) ----
db.exec(`
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, company TEXT, email TEXT, phone TEXT,
  interest TEXT, message TEXT, source TEXT DEFAULT 'web',
  status TEXT DEFAULT 'new', owner TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
`);

// ---- Hospital ----
db.exec(`
CREATE TABLE IF NOT EXISTS hospital_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, complaint TEXT, locale TEXT DEFAULT 'en',
  channel TEXT DEFAULT 'web', position INTEGER, eta_min INTEGER,
  status TEXT DEFAULT 'waiting', created_at INTEGER
);
`);

// ---- Hotel ----
db.exec(`
CREATE TABLE IF NOT EXISTS hotel_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest TEXT, room TEXT, nights INTEGER, locale TEXT DEFAULT 'en',
  channel TEXT DEFAULT 'web', status TEXT DEFAULT 'booked', created_at INTEGER
);
`);

// ---- Car ----
db.exec(`
CREATE TABLE IF NOT EXISTS car_cars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT, model TEXT, year INTEGER, fuel TEXT, km INTEGER,
  price INTEGER, city TEXT, status TEXT DEFAULT 'available'
);
CREATE TABLE IF NOT EXISTS car_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT, channel TEXT, intent TEXT, locale TEXT, status TEXT DEFAULT 'new',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
`);

// ---- Activity / audit feed (cross-agent) ----
db.exec(`
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent TEXT, icon TEXT, title TEXT, sub TEXT, user_id INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
`);

// ---- Conversations (optional memory per agent per user) ----
db.exec(`
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent TEXT, user_id INTEGER, role TEXT, text TEXT, created_at INTEGER
);
`);

// ---- Seed: first admin user (idempotent) ----
const adminCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
if (adminCount.c === 0) {
  const bcrypt = await import('bcryptjs');
  const hash = bcrypt.default.hashSync(process.env.ADMIN_PASS || 'ShreeAuto@2026', 10);
  db.prepare('INSERT INTO users (username, name, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?)')
    .run('admin', 'MASystem Admin', 'admin.ai.masystem@gmail.com', hash, 'admin', Date.now());
  console.log('[db] seeded first admin user: admin / (ADMIN_PASS)');
}

export default db;
