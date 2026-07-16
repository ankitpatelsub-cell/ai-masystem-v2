// routes/backoffice.js — Autonomous back-office agent (claude-agent-sdk + MCP DB tools, free local CLI).
import express from 'express';
import db from '../db.js';
import { requirePerm, logActivity } from '../auth.js';
import { runAgent } from '../agent_runner.mjs';
const router = express.Router();

const TASKS = {
  'summarize leads': 'Use the query_leads tool to list current leads, then summarize them in 3 short bullets.',
  'draft reply': 'Draft a professional customer-support reply to the latest lead.',
};

router.post('/run', requirePerm('backoffice:run'), async (req, res) => {
  const task = req.body?.task || '';
  const prompt = TASKS[task] || task;
  let result;
  try {
    result = await Promise.race([
      runAgent('You are the MASystem back-office agent. Use the MCP DB tools to answer accurately.', prompt, { maxTurns: 20 }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('agent timeout (120s)')), 120000)),
    ]);
  } catch (e) { result = '(agent error: ' + e.message + ')'; }
  db.prepare('INSERT INTO activity (agent,icon,title,sub,user_id) VALUES (?,?,?,?,?)').run('backoffice', '🤖', 'Back-office task', task.slice(0, 40), req.user?.uid || 0);
  res.json({ task, result });
});
router.get('/state', requirePerm('backoffice:run'), (_, res) => {
  res.json({ tasks: Object.keys(TASKS), provider: 'claude-agent-sdk (local CLI)' });
});
export default router;
