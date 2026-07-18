// routes/reminder.js — WhatsApp/LINE Reminder & No-Show Reduction agent.
// Manages appointments, sends reminders via pluggable channel (Gmail now; WhatsApp/LINE pluggable).
import express from 'express';
import db from '../db.js';
import { requirePerm, logActivity } from '../auth.js';
const router = express.Router();

// List appointments + due reminders.
router.get('/', requirePerm('leads:view'), (req, res) => {
  const appts = db.prepare('SELECT * FROM appointments ORDER BY appt_at ASC LIMIT 50').all();
  res.json({ appts });
});

// Seed an appointment (demo data; in production from hospital/hotel booking systems).
router.post('/appointment', requirePerm('leads:manage'), (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name required' });
  db.prepare('INSERT INTO appointments (lead_id,name,email,phone,appt_at,type,channel) VALUES (?,?,?,?,?,?,?)')
    .run(b.lead_id || null, b.name, b.email || '', b.phone || '', b.appt_at || Math.floor(Date.now()/1000)+86400, b.type || 'consultation', b.channel || 'whatsapp');
  res.json({ ok: true });
});

// Send a reminder for an appointment via the configured channel.
async function sendReminder(appt) {
  const { execFileSync } = await import('child_process');
  const HIMALAYA = '/root/.local/bin/himalaya';
  const msg = `Hi ${appt.name}, this is a reminder for your ${appt.type} on ${new Date(appt.appt_at*1000).toLocaleString()}. Reply to confirm or reschedule. — AI MASystem`;
  // Channel: email (Gmail) now; WhatsApp/LINE would use their APIs when creds available.
  const date = new Date().toUTCString().replace('GMT', '+0000');
  const raw = `To: ${appt.email||'admin.ai.masystem@gmail.com'}\r\nFrom: admin.ai.masystem@gmail.com\r\nSubject: Reminder: your ${appt.type}\r\nDate: ${date}\r\n\r\n${msg}\r\n`;
  const out = execFileSync(HIMALAYA, ['message', 'send'], { input: raw, encoding: 'utf8' });
  return out.trim();
}

router.post('/:id/send', requirePerm('leads:manage'), async (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'not found' });
  try {
    const r = await sendReminder(appt);
    db.prepare("UPDATE appointments SET reminder_sent=1, status='reminded' WHERE id=?").run(appt.id);
    logActivity('reminder', '⏰', 'Reminder sent', `${appt.name} (${appt.channel})`);
    res.json({ ok: true, result: r });
  } catch (e) { res.json({ ok: true, result: 'failed: ' + e.message.split('\n')[0] }); }
});

// Send reminders for all upcoming, unsent appointments (cron-friendly).
router.post('/run', requirePerm('leads:manage'), async (req, res) => {
  const due = db.prepare('SELECT * FROM appointments WHERE reminder_sent=0 AND appt_at > strftime("%s","now") LIMIT 20').all();
  let n = 0;
  for (const a of due) {
    try { await sendReminder(a); db.prepare("UPDATE appointments SET reminder_sent=1, status='reminded' WHERE id=?").run(a.id); n++; }
    catch (e) { /* skip */ }
  }
  res.json({ ok: true, sent: n });
});

export default router;
