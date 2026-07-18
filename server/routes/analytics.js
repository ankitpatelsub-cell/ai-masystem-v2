// routes/analytics.js — Owner-facing KPI digest (research gap #7).
import express from 'express';
import db from '../db.js';
import { requirePerm } from '../auth.js';
const router = express.Router();

router.get('/', requirePerm('leads:view'), (req, res) => {
  const now = Math.floor(Date.now()/1000);
  const day = now - 86400, week = now - 7*86400, month = now - 30*86400;
  const leads = {
    total: db.prepare('SELECT COUNT(*) c FROM leads').get().c,
    scored: db.prepare("SELECT COUNT(*) c FROM leads WHERE score IS NOT NULL AND score<>''").get().c,
    hot: db.prepare("SELECT COUNT(*) c FROM leads WHERE priority='hot'").get().c,
    contacted: db.prepare("SELECT COUNT(*) c FROM leads WHERE status='contacted'").get().c,
    bySegment: db.prepare("SELECT interest seg, COUNT(*) c FROM leads GROUP BY seg ORDER BY c DESC LIMIT 6").all(),
  };
  const activity = {
    today: db.prepare('SELECT COUNT(*) c FROM activity WHERE created_at>?').get(day).c,
    week: db.prepare('SELECT COUNT(*) c FROM activity WHERE created_at>?').get(week).c,
    month: db.prepare('SELECT COUNT(*) c FROM activity WHERE created_at>?').get(month).c,
  };
  const agents = {
    hospital_queue: db.prepare("SELECT COUNT(*) c FROM hospital_queue").get().c,
    hotel_bookings: db.prepare("SELECT COUNT(*) c FROM hotel_bookings").get().c,
    sdr_sent: db.prepare("SELECT COUNT(*) c FROM sdr_tasks WHERE sent=1").get().c,
    sdr_drafted: db.prepare('SELECT COUNT(*) c FROM sdr_tasks').get().c,
    reminders_sent: db.prepare("SELECT COUNT(*) c FROM appointments WHERE reminder_sent=1").get().c,
    reviews_drafted: db.prepare("SELECT COUNT(*) c FROM reviews WHERE response_draft<>''").get().c,
    invoices: db.prepare('SELECT COUNT(*) c FROM invoices').get().c,
  };
  const recent = db.prepare('SELECT agent,icon,title,sub,created_at FROM activity ORDER BY created_at DESC LIMIT 12').all();
  res.json({ leads, activity, agents, recent });
});

// Weekly owner digest (cron-friendly) — returns a text summary.
router.post('/digest', requirePerm('leads:view'), (req, res) => {
  const d = db.prepare('SELECT COUNT(*) c FROM leads').get().c;
  const hot = db.prepare("SELECT COUNT(*) c FROM leads WHERE priority='hot'").get().c;
  const sdr = db.prepare("SELECT COUNT(*) c FROM sdr_tasks WHERE sent=1").get().c;
  const hosp = db.prepare("SELECT COUNT(*) c FROM hospital_queue").get().c;
  const hotel = db.prepare("SELECT COUNT(*) c FROM hotel_bookings").get().c;
  const summary = `📊 AI MASystem weekly digest\n• Leads: ${d} (${hot} hot)\n• SDR emails sent: ${sdr}\n• Hospital check-ins: ${hosp}\n• Hotel bookings: ${hotel}\nYour AI front desk is running. — Team AI MASystem`;
  res.json({ ok: true, summary });
});

export default router;
