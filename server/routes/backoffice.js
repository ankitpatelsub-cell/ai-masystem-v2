// routes/backoffice.js — Autonomous back-office (LLM via shared llm_bridge with failover).
import express from 'express';
import db from '../db.js';
import { requirePerm, logActivity } from '../auth.js';
import bridge from '/root/shared/llm_bridge.js';
const runLLM = (prompt) => bridge.complete(prompt);
const router = express.Router();

const TASKS = {
  'summarize tickets': 'Summarize the latest support tickets concisely in 3 bullets.',
  'draft reply': 'Draft a professional customer-support reply to the latest ticket.',
};

router.post('/run', requirePerm('backoffice:run'), async (req, res) => {
  const task = req.body?.task || '';
  const prompt = TASKS[task] || task;
  let result;
  try {
    result = await Promise.race([
      runLLM(prompt),
      new Promise((_, rej) => setTimeout(() => rej(new Error('LLM timeout (60s)')), 60000)),
    ]);
  } catch (e) { result = '(LLM error: ' + e.message + ')'; }
  db.prepare('INSERT INTO activity (agent,icon,title,sub,user_id) VALUES (?,?,?,?,?)').run('backoffice', '🤖', 'Back-office task', task.slice(0, 40), req.user?.uid || 0);
  res.json({ task, result });
});
router.get('/state', requirePerm('backoffice:run'), (_, res) => {
  res.json({ tasks: Object.keys(TASKS), provider: process.env.MODEL_PROVIDER || 'claude' });
});
export default router;

