// routes/sdr.js — Outbound SDR / Appointment-Setter agent.
// Picks top-scored leads, has Claude draft personalized outreach, sends via Gmail, logs to sdr_tasks.
import express from 'express';
import db from '../db.js';
import { requirePerm, logActivity } from '../auth.js';
const router = express.Router();

router.get('/', requirePerm('leads:view'), (req, res) => {
  const tasks = db.prepare('SELECT * FROM sdr_tasks ORDER BY id DESC LIMIT 50').all();
  const queue = db.prepare("SELECT id,name,email,interest,score,priority,status FROM leads WHERE status='new' AND email<>'' AND score IS NOT NULL AND score<>'' ORDER BY CAST(score AS INTEGER) DESC LIMIT 20").all();
  res.json({ tasks, queue });
});

// Draft outreach for a specific lead (or top N) using Claude.
router.post('/draft', requirePerm('leads:manage'), async (req, res) => {
  const { leadId, topN = 3 } = req.body || {};
  const { runAgent } = await import('../agent_runner.mjs');
  let leads;
  if (leadId) leads = [db.prepare('SELECT * FROM leads WHERE id=?').get(leadId)].filter(Boolean);
  else leads = db.prepare("SELECT * FROM leads WHERE status='new' AND email<>'' AND score IS NOT NULL AND score<>'' ORDER BY CAST(score AS INTEGER) DESC LIMIT ?").all(topN);
  const made = [];
  for (const l of leads) {
    const draft = await runAgent(
      'You are the MASystem outbound SDR agent. Write a SHORT, warm, business-SPECIFIC outreach email that books a 5-minute demo call. Reference the lead’s real name, segment, and city. Clear CTA to book. Under 130 words, MASystem Admin persona.',
      `Lead: name=${l.name}, segment=${l.interest||'our AI agents'}, website=${l.company||'none'}, city=${(l.message||'').slice(0,60)}, email=${l.email}, score=${l.score}. Write the outreach email body (no subject/headers).`,
      { maxTurns: 15 }
    );
    db.prepare('INSERT INTO sdr_tasks (lead_id,name,email,segment,draft,status) VALUES (?,?,?,?,?,\'drafted\')').run(l.id, l.name, l.email, l.interest, draft);
    made.push({ leadId: l.id, name: l.name, draft });
  }
  res.json({ ok: true, made });
});

// Send a drafted SDR email via Gmail (real send).
router.post('/:id/send', requirePerm('leads:manage'), async (req, res) => {
  const task = db.prepare('SELECT * FROM sdr_tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'task not found' });
  const { execFileSync } = await import('child_process');
  const HIMALAYA = '/root/.local/bin/himalaya';
  const subject = `AI agent demo for ${task.name} — 5 min?`;
  const date = new Date().toUTCString().replace('GMT', '+0000');
  const raw = `To: ${task.email}\r\nFrom: admin.ai.masystem@gmail.com\r\nSubject: ${subject}\r\nDate: ${date}\r\n\r\n${task.draft}\r\n`;
  try {
    const out = execFileSync(HIMALAYA, ['message', 'send'], { input: raw, encoding: 'utf8' });
    db.prepare("UPDATE sdr_tasks SET status='sent', sent=1 WHERE id=?").run(task.id);
    db.prepare("UPDATE leads SET status='contacted' WHERE id=?").run(task.lead_id);
    logActivity('sdr', '📤', 'SDR email sent', `${task.name} (${task.segment})`);
    res.json({ ok: true, result: 'sent: ' + (out.trim() || 'ok') });
  } catch (e) { res.json({ ok: true, result: 'send failed: ' + e.message.split('\n')[0] }); }
});

// Auto-run: draft + queue for top N hottest leads (cron-friendly).
router.post('/run', requirePerm('leads:manage'), async (req, res) => {
  const topN = (req.body && req.body.topN) || 5;
  const r = await (async () => {
    const { runAgent } = await import('../agent_runner.mjs');
    const leads = db.prepare("SELECT * FROM leads WHERE status='new' AND email<>'' AND score IS NOT NULL AND score<>'' ORDER BY CAST(score AS INTEGER) DESC LIMIT ?").all(topN);
    let n = 0;
    for (const l of leads) {
      const draft = await runAgent('You are the MASystem outbound SDR. Write a 5-minute-demo outreach email body (no subject/headers), under 130 words, reference the lead’s real name/segment/city.', `Lead: ${l.name}, ${l.interest}, ${l.email}, score ${l.score}.`, { maxTurns: 15 });
      db.prepare('INSERT INTO sdr_tasks (lead_id,name,email,segment,draft,status) VALUES (?,?,?,?,?,\'drafted\')').run(l.id, l.name, l.email, l.interest, draft);
      n++;
    }
    return n;
  })();
  res.json({ ok: true, drafted: r });
});

export default router;
