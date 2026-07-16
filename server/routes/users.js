// routes/users.js — admin user management (multi-user system).
import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth } from '../auth.js';
const router = express.Router();

// list users (admin only)
router.get('/', requireAuth(['admin']), (_, res) => {
  res.json(db.prepare('SELECT id,username,name,email,role,created_at FROM users ORDER BY id').all());
});
// create user (admin only)
router.post('/', requireAuth(['admin']), (req, res) => {
  const { username, password, name, email, role } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username + password required' });
  if (db.prepare('SELECT id FROM users WHERE username=?').get(username)) return res.status(409).json({ error: 'username taken' });
  const hash = bcrypt.hashSync(password, 10);
  const id = db.prepare('INSERT INTO users (username,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').run(username, name || '', email || '', hash, role || 'staff', Date.now()).lastInsertRowid;
  res.json({ id, username, role: role || 'staff' });
});
// change role / disable (admin only)
router.patch('/:id', requireAuth(['admin']), (req, res) => {
  const { role, disabled } = req.body || {};
  if (role) db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  // "disable" = set a flag via role 'disabled' (kept simple)
  if (disabled) db.prepare("UPDATE users SET role='disabled' WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});
// delete (admin only)
router.delete('/:id', requireAuth(['admin']), (req, res) => {
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
