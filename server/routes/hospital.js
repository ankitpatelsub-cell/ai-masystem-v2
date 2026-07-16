// routes/hospital.js — Patient queue on SHARED db.
import express from 'express';
import db from '../db.js';
import { logActivity } from '../auth.js';
const router = express.Router();
const I18N = { en:{joined:'Joined', eta:'ETA', surge:'Surge', voice:'Voice alert', think:'intake'}, hi:{joined:'शामिल', eta:'अनुमानित', surge:'भीड़', voice:'आवाज़ अलर्ट', think:'प्रवेश'}, ja:{joined:'受付', eta:'目安', surge:'混雑', voice:'音声通知', think:'受付中'} };

function understand(t){ const L=(t||'').toLowerCase();
  const m=(L.match(/name is ([a-z]+)|i am ([a-z]+)|मेरा नाम ([a-z]+)|नाम ([a-z]+)/)||[]);
  const raw=m[1]||m[2]||m[3]||m[4];
  const name=raw?raw.charAt(0).toUpperCase()+raw.slice(1):'';
  const complaint=(L.match(/fever|pain|दर्द|बुखार|熱|head|सिर|chest|सीने/)||[])[0]||'';
  return { name, complaint }; }

function intake(text, locale){
  const L=I18N[locale]||I18N.en; const p=understand(text);
  const cnt=db.prepare("SELECT COUNT(*) c FROM hospital_queue WHERE status='waiting'").get().c;
  const pos=cnt+1; const eta=pos*7;
  const id=db.prepare('INSERT INTO hospital_queue (name,complaint,locale,channel,position,eta_min,status,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(p.name||'Guest', p.complaint||'', locale||'en','web',pos,eta,'waiting',Date.now()).lastInsertRowid;
  const steps=[{tool:'think',result:`(${L.think}) ${p.name||'Guest'}`},{tool:'join',result:`${L.joined} #${id} (web)`},{tool:'report_position',result:`${pos}/${pos+ (db.prepare("SELECT COUNT(*) c FROM hospital_queue WHERE status='waiting'").get().c -1)+0} · ${eta} ${L.eta}`}];
  const waiting=db.prepare("SELECT COUNT(*) c FROM hospital_queue WHERE status='waiting'").get().c;
  if(waiting>=5){ steps.push({tool:'surge_detected',result:`${L.surge}: ${waiting}`}); steps.push({tool:'notify_voice',result:`${L.voice} (${waiting})`}); }
  return {id, steps};
}
router.post('/intake',(req,res)=>{ const {text,locale}=req.body||{}; const o=intake(text,locale); logActivity('hospital','🏥','Patient intake',(text||'').slice(0,40)); res.json(o); });
router.get('/state',(_,res)=>{ const q=db.prepare("SELECT * FROM hospital_queue WHERE status='waiting' ORDER BY position").all(); res.json({queue:q,waiting:q.length}); });
router.post('/next',(req,res)=>{ const row=db.prepare("SELECT * FROM hospital_queue WHERE status='waiting' ORDER BY position LIMIT 1").get();
  if(!row) return res.json({msg:'empty'}); db.prepare("UPDATE hospital_queue SET status='seen' WHERE id=?").run(row.id); logActivity('hospital','🏥','Called next',`#${row.id}`); res.json({called:row}); });
export default router;
