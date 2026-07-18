// routes/translate.js — Multilingual JP/EN (and HI/GU/EN) handoff agent.
// Translates messages and tags language; can be wired into hospital/hotel agents for live handoff.
import express from 'express';
import db from '../db.js';
import { requirePerm } from '../auth.js';
const router = express.Router();

router.post('/translate', requirePerm('leads:view'), async (req, res) => {
  const { text, from = 'auto', to = 'en' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  const { runAgent } = await import('../agent_runner.mjs');
  const out = await runAgent(
    `You are a translation engine. Translate the user's text and output it STRICTLY in ${to} language only. Do not translate into any other language. Reply with ONLY the translated text, no commentary, no quotes.`,
    `Translate to ${to}. Text: ${text}`,
    { maxTurns: 6 }
  );
  res.json({ ok: true, translated: out, from, to });
});

// Detect language of a message (used to route to JP or EN specialist).
router.post('/detect', requirePerm('leads:view'), async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  const { runAgent } = await import('../agent_runner.mjs');
  const lang = await runAgent('Identify the language of this text. Reply with ONLY the ISO code (en, ja, hi, gu, etc.).', text, { maxTurns: 4 });
  res.json({ ok: true, lang: (lang || 'en').trim().slice(0, 5) });
});

export default router;
