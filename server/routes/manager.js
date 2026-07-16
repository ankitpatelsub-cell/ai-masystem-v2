// routes/manager.js — The "call agent": routes any request to the right specialist.
import express from 'express';
import db from '../db.js';
import { logActivity } from '../auth.js';
const router = express.Router();
const AGENTS = { hospital:'🏥 Hospital Queue', hotel:'🏨 Hotel Booking', car:'🚗 Car Sales', backoffice:'🤖 Back-Office AI', reels:'🎬 Reels Studio' };
async function classify(text){
  const t=(text||'').toLowerCase();
  if(/patient|appointment|hospital|बुखार|दर्द|भर्ती|病院|診察/.test(t)) return 'hospital';
  if(/hotel|room|booking|stay|कमरा|होटल|ホテル|予約/.test(t)) return 'hotel';
  if(/car|price|exchange|vehicle|कार|गाड़ी|車|ローン/.test(t)) return 'car';
  if(/reel|video|post|marketing|रील|वीडियो|動画/.test(t)) return 'reels';
  if(/email|ticket|report|schedule|ईमेल|रिपोर्ट|メール/.test(t)) return 'backoffice';
  return 'backoffice';
}
router.post('/route', async (req,res)=>{ const target=await classify(req.body?.request||req.body?.text||''); logActivity('manager','🎯','Routed request',`→ ${AGENTS[target]}`); res.json({target, agent:AGENTS[target]}); });
router.get('/agents',(_,res)=>res.json(AGENTS));
export default router;
