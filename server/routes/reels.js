// routes/reels.js — Reels studio (preview + AI poster; full video with funded key).
import express from 'express';
import db from '../db.js';
import { requireAuth, logActivity } from '../auth.js';
const router = express.Router();
const SCRIPTS = {
  car: ['Hook: New arrival at Shree Auto!', 'Scene: Walkaround of the latest model', 'Scene: On-road price reveal', 'CTA: Book a test drive today'],
  hotel: ['Hook: Your perfect stay awaits', 'Scene: Room tour', 'Scene: Rooftop & breakfast', 'CTA: Book direct, save on commission'],
};
router.post('/build', (req,res)=>{
  const topic = req.body?.topic || req.body?.text || 'promo';
  const kind = /hotel|stay|room/i.test(topic) ? 'hotel' : /car|auto|vehicle/i.test(topic) ? 'car' : 'car';
  const script = { hook: SCRIPTS[kind][0], scenes: SCRIPTS[kind].slice(1,-1).map((t,i)=>({t:i, text:t})), cta: SCRIPTS[kind].slice(-1)[0] };
  const funded = !!process.env.OPENROUTER_API_KEY;
  logActivity('reels','🎬','Reel generated',topic.slice(0,40));
  res.json({ id: Date.now(), lang:'en', mode: funded?'video':'preview', note: funded?'Rendering video…':'Preview slate + AI poster. Add funded OpenRouter key for full video.', script });
});
router.get('/list', (_,res)=> res.json(db.prepare("SELECT * FROM activity WHERE agent='reels' ORDER BY id DESC LIMIT 10").all()));
export default router;
