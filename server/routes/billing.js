// routes/billing.js — Billing / Invoicing & Payment Collection agent.
// Generates invoices from a simple model and drafts UPI/PayPay payment reminders.
import express from 'express';
import db from '../db.js';
import { requirePerm, logActivity } from '../auth.js';
const router = express.Router();

// Simple invoice model stored in leads.meta or a dedicated table; here we use a JSON-ish column.
db.exec(`CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER, business TEXT, amount REAL, currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'unpaid', due_at INTEGER, reminder_sent INTEGER DEFAULT 0, created_at INTEGER DEFAULT (strftime('%s','now'))
)`);

router.get('/', requirePerm('leads:view'), (req, res) => {
  res.json({ invoices: db.prepare('SELECT * FROM invoices ORDER BY id DESC LIMIT 50').all() });
});

router.post('/invoice', requirePerm('leads:manage'), (req, res) => {
  const b = req.body || {};
  if (!b.business || !b.amount) return res.status(400).json({ error: 'business + amount required' });
  db.prepare('INSERT INTO invoices (lead_id,business,amount,currency,due_at) VALUES (?,?,?,?,?)')
    .run(b.lead_id || null, b.business, b.amount, b.currency || 'INR', b.due_at || Math.floor(Date.now()/1000)+2592000);
  res.json({ ok: true });
});

// Draft a payment reminder (UPI for India, PayPay for Japan) via Gmail.
router.post('/:id/remind', requirePerm('leads:manage'), async (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'not found' });
  const { execFileSync } = await import('child_process');
  const HIMALAYA = '/root/.local/bin/himalaya';
  const pay = inv.currency === 'JPY' ? 'PayPay' : 'UPI';
  const body = `Dear ${inv.business},\n\nThis is a friendly reminder that invoice #${inv.id} for ${inv.amount} ${inv.currency} is due. You can pay instantly via ${pay}. Thank you for your business!\n\n— Team AI MASystem`;
  const date = new Date().toUTCString().replace('GMT', '+0000');
  const raw = `To: admin.ai.masystem@gmail.com\r\nFrom: admin.ai.masystem@gmail.com\r\nSubject: Payment Reminder — Invoice #${inv.id}\r\nDate: ${date}\r\n\r\n${body}\r\n`;
  try {
    const out = execFileSync(HIMALAYA, ['message', 'send'], { input: raw, encoding: 'utf8' });
    db.prepare("UPDATE invoices SET reminder_sent=1 WHERE id=?").run(inv.id);
    logActivity('billing', '💳', 'Payment reminder sent', `Invoice #${inv.id} (${inv.amount} ${inv.currency})`);
    res.json({ ok: true, result: out.trim() });
  } catch (e) { res.json({ ok: true, result: 'failed: ' + e.message.split('\n')[0] }); }
});

export default router;
