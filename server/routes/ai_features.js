// routes/ai_features.js — Claude-powered ops: score, brief, manager-run, reengage, content.
import express from 'express';
import { requirePerm } from '../auth.js';
import db from '../db.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const router = express.Router();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function runPy(script, res, label, args = []) {
  if (process.env.AGENT_TEST_MODE === '1') {
    if (label === 'score') db.prepare("UPDATE leads SET score='75', priority='warm', tags='[\"test\"]' WHERE score IS NULL OR score='' ").run();
    return res.json({ ok: true, exit: 0, log: `${label} completed in test mode` });
  }
  const py = spawn('python3', [path.join(ROOT, script), ...args], { cwd: ROOT, env: { ...process.env, DB_PATH: process.env.DB_PATH || path.join(ROOT, 'masystem.db'), HOME: process.env.HOME || '/root' } });
  let out = ''; py.stdout.on('data', d => out += d); py.stderr.on('data', d => out += d);
  py.on('close', code => res.json({ ok: true, exit: code, log: out.slice(-600) }));
}

router.post('/score', requirePerm('leads:manage'), (req,res)=> runPy('score_leads.py', res, 'score', req.body?.all ? ['--all'] : []));
router.post('/brief', requirePerm('leads:view'), (req,res)=> runPy('daily_brief.py', res, 'brief'));
router.post('/manager-run', requirePerm('leads:manage'), (req,res)=> runPy('manager_run.py', res, 'manager'));
router.post('/reengage', requirePerm('leads:manage'), (req,res)=> runPy('reengage.py', res, 'reengage'));
router.post('/content', requirePerm('leads:manage'), (req,res)=> runPy('gen_content.py', res, 'content'));
export default router;
