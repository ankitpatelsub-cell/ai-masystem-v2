// routes/ai_features.js — Claude-powered ops: score, brief, manager-run, reengage, content.
import express from 'express';
import { requirePerm } from '../auth.js';
import { spawn } from 'child_process';
const router = express.Router();

function runPy(script, res, label) {
  const ROOT = '/root/ai-masystem-v2';
  const py = spawn('python3', [ROOT + '/' + script], { cwd: ROOT, env: { ...process.env, DB_PATH: process.env.DB_PATH || '/root/ai-masystem-v2/masystem.db', HOME: process.env.HOME || '/root' } });
  let out = ''; py.stdout.on('data', d => out += d); py.stderr.on('data', d => out += d);
  py.on('close', code => res.json({ ok: true, exit: code, log: out.slice(-600) }));
}

router.post('/score', requirePerm('leads:manage'), (req,res)=> runPy('score_leads.py' + (req.body?.all ? ' --all' : ''), res, 'score'));
router.post('/brief', requirePerm('leads:view'), (req,res)=> runPy('daily_brief.py', res, 'brief'));
router.post('/manager-run', requirePerm('leads:manage'), (req,res)=> runPy('manager_run.py', res, 'manager'));
router.post('/reengage', requirePerm('leads:manage'), (req,res)=> runPy('reengage.py', res, 'reengage'));
router.post('/content', requirePerm('leads:manage'), (req,res)=> runPy('gen_content.py', res, 'content'));
export default router;
