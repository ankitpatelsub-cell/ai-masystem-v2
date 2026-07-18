// routes/reviews.js — Review & Reputation Management agent.
// Stores incoming reviews, has Claude draft a professional response, supports send-ready drafts.
import express from 'express';
import db from '../db.js';
import { requirePerm, logActivity } from '../auth.js';
const router = express.Router();

router.get('/', requirePerm('leads:view'), (req, res) => {
  const reviews = db.prepare('SELECT * FROM reviews ORDER BY id DESC LIMIT 50').all();
  res.json({ reviews });
});

// Add a review (in production, monitored from Google/Booking/Zomato; here, manual + seedable).
router.post('/', requirePerm('leads:manage'), (req, res) => {
  const b = req.body || {};
  if (!b.business) return res.status(400).json({ error: 'business required' });
  db.prepare('INSERT INTO reviews (business,platform,rating,text) VALUES (?,?,?,?)')
    .run(b.business, b.platform || 'google', b.rating || 5, b.text || '');
  res.json({ ok: true });
});

// Draft a response using Claude (professional, brand-voice, empathetic).
router.post('/:id/respond', requirePerm('leads:manage'), async (req, res) => {
  const rev = db.prepare('SELECT * FROM reviews WHERE id=?').get(req.params.id);
  if (!rev) return res.status(404).json({ error: 'not found' });
  const { runAgent } = await import('../agent_runner.mjs');
  const draft = await runAgent(
    'You are the MASystem reputation agent. Draft a SHORT, warm, professional public response to this review. If negative, acknowledge + offer to make it right. If positive, thank genuinely. No hashtags. Under 80 words, sign "Team AI MASystem".',
    `Business: ${rev.business} (${rev.platform}). Rating: ${rev.rating}/5. Review: "${rev.text}". Write the response.`,
    { maxTurns: 12 }
  );
  db.prepare("UPDATE reviews SET response_draft=?, status='drafted' WHERE id=?").run(draft, rev.id);
  logActivity('reviews', '⭐', 'Review response drafted', `${rev.business} (${rev.rating}★)`);
  res.json({ ok: true, draft });
});

// Auto-draft responses for all pending reviews (cron-friendly).
router.post('/run', requirePerm('leads:manage'), async (req, res) => {
  const pending = db.prepare("SELECT * FROM reviews WHERE status='pending' OR response_draft IS NULL OR response_draft=''").all();
  const { runAgent } = await import('../agent_runner.mjs');
  let n = 0;
  for (const rev of pending) {
    const draft = await runAgent('Draft a short professional review response (under 80 words, sign Team AI MASystem).', `Business ${rev.business}, rating ${rev.rating}/5, review: ${rev.text}`, { maxTurns: 12 });
    db.prepare("UPDATE reviews SET response_draft=?, status='drafted' WHERE id=?").run(draft, rev.id);
    n++;
  }
  res.json({ ok: true, drafted: n });
});

export default router;
