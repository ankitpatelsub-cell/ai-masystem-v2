// routes/leads.js — shared lead pipeline (was biz-site).
import express from 'express';
import db from '../db.js';
import { requireAuth, logActivity } from '../auth.js';
const router = express.Router();
router.post('/', (req,res)=>{ const b=req.body||{};
  if(!b.name || !b.email) return res.status(400).json({error:'name + email required'});
  db.prepare('INSERT INTO leads (name,company,email,phone,interest,message,source,status) VALUES (?,?,?,?,?,?,?,?)')
    .run(b.name,b.company||'',b.email,b.phone||'',b.interest||'',b.message||'','web','new');
  logActivity('leads','📥','New lead',`${b.name} / ${b.interest||''}`);
  res.json({ok:true});
});
router.get('/', requireAuth(['admin','staff']), (req,res)=>{
  const rows = db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 100').all();
  res.json(rows);
});
router.patch('/:id', requireAuth(['admin','staff']), (req,res)=>{
  const { status, owner } = req.body||{};
  if(status) db.prepare('UPDATE leads SET status=? WHERE id=?').run(status, req.params.id);
  if(owner) db.prepare('UPDATE leads SET owner=? WHERE id=?').run(owner, req.params.id);
  res.json({ok:true});
});
export default router;
