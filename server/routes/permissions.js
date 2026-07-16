// routes/permissions.js — admin-managed role/permission matrix.
import express from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
const router = express.Router();

// list all roles x perms
router.get('/', requireAuth(['admin']), (_, res) => {
  const rows = db.prepare('SELECT role,perm,allowed FROM role_permissions').all();
  const out = {};
  for (const r of rows) { (out[r.role] ||= {})[r.perm] = !!r.allowed; }
  res.json(out);
});
// update one perm for a role
router.post('/', requireAuth(['admin']), (req, res) => {
  const { role, perm, allowed } = req.body || {};
  if (!role || !perm) return res.status(400).json({ error: 'role + perm required' });
  db.prepare('INSERT OR REPLACE INTO role_permissions (role,perm,allowed) VALUES (?,?,?)').run(role, perm, allowed ? 1 : 0);
  res.json({ ok: true });
});
// all available permission keys (for UI)
router.get('/keys', requireAuth(['admin']), (_, res) => {
  res.json(Array.from(new Set(db.prepare('SELECT DISTINCT perm FROM role_permissions').all().map(r => r.perm))).sort());
});

export default router;
