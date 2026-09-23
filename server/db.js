// db.js — ONE shared SQLite database for the entire AI MASystem.
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
import Database from 'better-sqlite3';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'masystem.db');
if (process.env.RESET_TEST_DB === '1') {
  for (const suffix of ['', '-shm', '-wal']) {
    try { fs.rmSync(`${DB_PATH}${suffix}`); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}
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
  score TEXT, priority TEXT, tags TEXT, summary TEXT,
  last_contact_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
`);

// Backfill columns for databases created before lead scoring and outreach fields
// were introduced. SQLite only supports adding one column at a time.
const leadColumns = new Set(db.prepare('PRAGMA table_info(leads)').all().map(column => column.name));
for (const [name, type] of Object.entries({ score: 'TEXT', priority: 'TEXT', tags: 'TEXT', summary: 'TEXT', last_contact_at: 'INTEGER' })) {
  if (!leadColumns.has(name)) db.exec(`ALTER TABLE leads ADD COLUMN ${name} ${type}`);
}

// ---- Outreach, reminder, and reputation workflows ----
db.exec(`
CREATE TABLE IF NOT EXISTS sdr_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER, name TEXT, email TEXT, segment TEXT,
  draft TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'drafted',
  sent INTEGER NOT NULL DEFAULT 0, created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY(lead_id) REFERENCES leads(id)
);
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER, name TEXT NOT NULL, email TEXT, phone TEXT,
  appt_at INTEGER NOT NULL, type TEXT NOT NULL DEFAULT 'consultation',
  channel TEXT NOT NULL DEFAULT 'whatsapp', status TEXT NOT NULL DEFAULT 'scheduled',
  reminder_sent INTEGER NOT NULL DEFAULT 0, created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY(lead_id) REFERENCES leads(id)
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business TEXT NOT NULL, platform TEXT NOT NULL DEFAULT 'google', rating INTEGER NOT NULL DEFAULT 5,
  text TEXT NOT NULL DEFAULT '', response_draft TEXT, status TEXT NOT NULL DEFAULT 'pending',
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

// ---- Hospital appointment booking, arrival, and live-queue operations ----
db.exec(`
CREATE TABLE IF NOT EXISTS hospital_doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, specialty TEXT NOT NULL, location TEXT NOT NULL DEFAULT 'Main OPD',
  default_duration_min INTEGER NOT NULL DEFAULT 15, active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hospital_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL, starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1, reserved INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL,
  UNIQUE(doctor_id, starts_at), FOREIGN KEY(doctor_id) REFERENCES hospital_doctors(id)
);
CREATE TABLE IF NOT EXISTS hospital_appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_code TEXT NOT NULL UNIQUE, checkin_code TEXT NOT NULL UNIQUE,
  patient_name TEXT NOT NULL, phone TEXT, email TEXT, abha_number TEXT,
  consent_at INTEGER, doctor_id INTEGER NOT NULL, slot_id INTEGER,
  reason TEXT, status TEXT NOT NULL DEFAULT 'confirmed', priority TEXT NOT NULL DEFAULT 'normal',
  priority_reason TEXT, queue_number INTEGER, estimated_wait_min INTEGER,
  checked_in_at INTEGER, called_at INTEGER, completed_at INTEGER, cancelled_at INTEGER,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  FOREIGN KEY(doctor_id) REFERENCES hospital_doctors(id), FOREIGN KEY(slot_id) REFERENCES hospital_slots(id)
);
CREATE TABLE IF NOT EXISTS hospital_waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL, requested_date TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL, FOREIGN KEY(appointment_id) REFERENCES hospital_appointments(id)
);
CREATE TABLE IF NOT EXISTS hospital_queue_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL, event_type TEXT NOT NULL, from_status TEXT, to_status TEXT,
  actor TEXT NOT NULL DEFAULT 'system', note TEXT, created_at INTEGER NOT NULL,
  FOREIGN KEY(appointment_id) REFERENCES hospital_appointments(id)
);
CREATE TABLE IF NOT EXISTS hospital_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL, channel TEXT NOT NULL DEFAULT 'in_app',
  kind TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued',
  created_at INTEGER NOT NULL, FOREIGN KEY(appointment_id) REFERENCES hospital_appointments(id)
);
CREATE TABLE IF NOT EXISTS hospital_schedule_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL, starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'unavailable', reason TEXT, created_at INTEGER NOT NULL,
  FOREIGN KEY(doctor_id) REFERENCES hospital_doctors(id)
);
CREATE TABLE IF NOT EXISTS hospital_public_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL, purpose TEXT NOT NULL, code TEXT NOT NULL,
  expires_at INTEGER NOT NULL, verified_at INTEGER, created_at INTEGER NOT NULL,
  FOREIGN KEY(appointment_id) REFERENCES hospital_appointments(id)
);
CREATE TABLE IF NOT EXISTS hospital_departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE, location TEXT NOT NULL DEFAULT 'Main campus',
  active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hospital_holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holiday_date TEXT NOT NULL UNIQUE, name TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hospital_slot_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL, weekday INTEGER NOT NULL,
  start_time TEXT NOT NULL, end_time TEXT NOT NULL, duration_min INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1, service_type TEXT NOT NULL DEFAULT 'Consultation',
  active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL,
  FOREIGN KEY(doctor_id) REFERENCES hospital_doctors(id)
);
CREATE TABLE IF NOT EXISTS hospital_triage_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL, disposition TEXT NOT NULL,
  red_flags TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '', nurse TEXT NOT NULL,
  created_at INTEGER NOT NULL, FOREIGN KEY(appointment_id) REFERENCES hospital_appointments(id)
);
CREATE TABLE IF NOT EXISTS hospital_visit_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL, stage TEXT NOT NULL, label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', room TEXT, queue_number INTEGER,
  started_at INTEGER, completed_at INTEGER, updated_at INTEGER NOT NULL,
  UNIQUE(appointment_id,stage), FOREIGN KEY(appointment_id) REFERENCES hospital_appointments(id)
);
CREATE TABLE IF NOT EXISTS hospital_doctor_absences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL, starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL,
  substitute_doctor_id INTEGER, reason TEXT, created_by TEXT NOT NULL, created_at INTEGER NOT NULL,
  FOREIGN KEY(doctor_id) REFERENCES hospital_doctors(id), FOREIGN KEY(substitute_doctor_id) REFERENCES hospital_doctors(id)
);
CREATE TABLE IF NOT EXISTS hospital_integration_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL, target TEXT NOT NULL, event_type TEXT NOT NULL,
  status TEXT NOT NULL, detail TEXT, created_at INTEGER NOT NULL,
  FOREIGN KEY(appointment_id) REFERENCES hospital_appointments(id)
);
`);

// Additive migrations keep existing hospital databases compatible with the
// scheduling and queue upgrades without requiring a destructive migration.
const hospitalDoctorColumns = new Set(db.prepare('PRAGMA table_info(hospital_doctors)').all().map(column => column.name));
for (const [name, type] of Object.entries({ department: "TEXT NOT NULL DEFAULT 'General OPD'", department_id: 'INTEGER', room: "TEXT NOT NULL DEFAULT 'Reception'" })) {
  if (!hospitalDoctorColumns.has(name)) db.exec(`ALTER TABLE hospital_doctors ADD COLUMN ${name} ${type}`);
}
const hospitalSlotColumns = new Set(db.prepare('PRAGMA table_info(hospital_slots)').all().map(column => column.name));
for (const [name, type] of Object.entries({ service_type: "TEXT NOT NULL DEFAULT 'Consultation'" })) {
  if (!hospitalSlotColumns.has(name)) db.exec(`ALTER TABLE hospital_slots ADD COLUMN ${name} ${type}`);
}
const hospitalAppointmentColumns = new Set(db.prepare('PRAGMA table_info(hospital_appointments)').all().map(column => column.name));
for (const [name, type] of Object.entries({ visit_type: "TEXT NOT NULL DEFAULT 'appointment'", language: "TEXT NOT NULL DEFAULT 'en'", triage_status: "TEXT NOT NULL DEFAULT 'not_assessed'", original_doctor_id: 'INTEGER' })) {
  if (!hospitalAppointmentColumns.has(name)) db.exec(`ALTER TABLE hospital_appointments ADD COLUMN ${name} ${type}`);
}

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

// ---- Roles & Permissions matrix (admin-managed) ----
db.exec(`
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  perm TEXT NOT NULL,
  allowed INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(role, perm)
);
`);
const DEFAULT_PERMS = {
  admin: ['car:chat','car:manage','hospital:chat','hospital:manage','hotel:chat','hotel:manage','manager:use','backoffice:run','reels:build','leads:view','leads:manage','users:manage','settings:manage'],
  staff: ['car:chat','car:manage','hospital:chat','hospital:manage','hotel:chat','manager:use','backoffice:run','reels:build','leads:view','leads:manage'],
  viewer: ['car:chat','hospital:chat','hotel:chat','manager:use','leads:view'],
};
const ALL_PERMS = Array.from(new Set(Object.values(DEFAULT_PERMS).flat()));
for (const [role, perms] of Object.entries(DEFAULT_PERMS)) {
  for (const p of ALL_PERMS) {
    const allowed = perms.includes(p) ? 1 : 0;
    db.prepare('INSERT OR REPLACE INTO role_permissions (role,perm,allowed) VALUES (?,?,?)').run(role, p, allowed);
  }
}

// ---- Seed: first admin user (idempotent) ----
const adminCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
if (adminCount === 0) {
  const bcrypt = await import('bcryptjs');
  const hash = bcrypt.default.hashSync(process.env.ADMIN_PASS || 'ShreeAuto@2026', 10);
  db.prepare('INSERT INTO users (username, name, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?)')
    .run('admin', 'MASystem Admin', 'admin.ai.masystem@gmail.com', hash, 'admin', Date.now());
  console.log('[db] seeded first admin user: admin / (ADMIN_PASS)');
}

export default db;
