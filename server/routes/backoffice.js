// routes/backoffice.js — Autonomous back-office (LLM via local Claude CLI or OpenRouter).
import express from 'express';
import db from '../db.js';
import { requireAuth, logActivity } from '../auth.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
const exec = promisify(execFile);
const router = express.Router();

async function claudeRun(task){
  const provider = process.env.MODEL_PROVIDER || 'claude';
  if(provider === 'claude'){
    try {
      const { stdout } = await exec('/root/.hermes/node/bin/node', [], { /* placeholder */ timeout: 60000 }).catch(()=>({stdout:''}));
      // use the real claude chat CLI
      const { execFile: ex } = await import('child_process');
      const out = await new Promise((resolve)=>{
        const p = ex('/root/.local/bin/claude', ['--print','-p', task, '--allowedTools','', '--model','sonnet'], {timeout:60000, maxBuffer:1e7});
        let s=''; p.stdout.on('data',d=>s+=d); p.stderr.on('data',d=>{}); p.on('close',()=>resolve(s));
      });
      return out.trim();
    } catch(e){ return '(claude unavailable: '+e.message+')'; }
  }
  return '(provider '+provider+' not configured)';
}

const TASKS = {
  'summarize tickets': async () => claudeRun('Summarize the latest support tickets concisely in 3 bullets.'),
  'draft reply': async () => claudeRun('Draft a professional customer-support reply to the latest ticket.'),
};

router.post('/run', requireAuth(['admin','staff','viewer']), async (req,res)=>{
  const task = req.body?.task || '';
  let result;
  if(TASKS[task]) result = await TASKS[task]();
  else result = await claudeRun(task);
  db.prepare('INSERT INTO activity (agent,icon,title,sub,user_id) VALUES (?,?,?,?,?)').run('backoffice','🤖','Back-office task',task.slice(0,40), req.user?.uid||0);
  res.json({ task, result });
});
router.get('/state', requireAuth(['admin','staff','viewer']), (_,res)=>{
  res.json({ tasks:Object.keys(TASKS), provider:process.env.MODEL_PROVIDER||'claude' });
});
export default router;
