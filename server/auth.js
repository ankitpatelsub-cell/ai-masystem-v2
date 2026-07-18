// auth.js — multi-user JWT auth: register, login, logout, middleware.
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from './db.js';

const SECRET = process.env.JWT_SECRET || 'replace-with-long-random-jwt-secret';
const TOKEN_TTL = 60 * 60 * 12; // 12h access
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30d

const router = express.Router();

function signAccess(user) {
  return jwt.sign({ uid: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: TOKEN_TTL });
}
function signRefresh(user) {
  const tok = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT OR REPLACE INTO refresh_tokens (token, user_id, expires_at) VALUES (?,?,?)')
    .run(tok, user.id, Date.now() + REFRESH_TTL * 1000);
  return tok;
}

// POST /api/auth/register  (admin only — creating the very first user must go through
// a DB-level seed, not this HTTP endpoint, so there is no unauthenticated bootstrap path)
router.post('/register', requireAuth(['admin']), async (req, res) => {
  const { username, password, name, email, role } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username + password required' });
  const exists = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (exists) return res.status(409).json({ error: 'username taken' });
  const hash = bcrypt.hashSync(password, 10);
  const user = db.prepare('INSERT INTO users (username,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?) RETURNING id,username,name,email,role')
    .get(username, name || '', email || '', hash, role || 'staff', Date.now());
  res.json({ user, token: signAccess(user), refreshToken: signRefresh(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!u || !bcrypt.compareSync(password || '', u.password_hash)) return res.status(401).json({ error: 'invalid credentials' });
  const user = { id: u.id, username: u.username, name: u.name, email: u.email, role: u.role };
  res.json({ user, token: signAccess(user), refreshToken: signRefresh(user) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const r = req.body?.refreshToken;
  if (r) db.prepare('DELETE FROM refresh_tokens WHERE token=?').run(r);
  res.json({ ok: true });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const r = req.body?.refreshToken;
  const row = r && db.prepare('SELECT * FROM refresh_tokens WHERE token=?').get(r);
  if (!row || row.expires_at < Date.now()) return res.status(401).json({ error: 'refresh expired' });
  const u = db.prepare('SELECT id,username,name,email,role FROM users WHERE id=?').get(row.user_id);
  res.json({ token: signAccess(u) });
});

// middleware
export function requireAuth(roles) {
  return (req, res, next) => {
    const h = req.headers['authorization'] || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'auth required' });
    try {
      const d = jwt.verify(token, SECRET);
      req.user = d;
      if (roles && !roles.includes(d.role)) return res.status(403).json({ error: 'forbidden' });
      next();
    } catch { res.status(401).json({ error: 'invalid token' }); }
  };
}

// Permission check against the admin-managed matrix in DB.
export function requirePerm(perm) {
  return (req, res, next) => {
    const h = req.headers['authorization'] || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'auth required' });
    let d;
    try { d = jwt.verify(token, SECRET); } catch { return res.status(401).json({ error: 'invalid token' }); }
    req.user = d;
    const row = db.prepare('SELECT allowed FROM role_permissions WHERE role=? AND perm=?').get(d.role, perm);
    if (!row || !row.allowed) return res.status(403).json({ error: 'no permission: ' + perm });
    next();
  };
}
export function hasPerm(role, perm) {
  const row = db.prepare('SELECT allowed FROM role_permissions WHERE role=? AND perm=?').get(role, perm);
  return !!(row && row.allowed);
}
export function logActivity(agent, icon, title, sub, userId) {
  try { db.prepare('INSERT INTO activity (agent,icon,title,sub,user_id) VALUES (?,?,?,?,?)').run(agent, icon, title, sub || '', userId || 0); } catch {}
}

export { router as authRouter };
