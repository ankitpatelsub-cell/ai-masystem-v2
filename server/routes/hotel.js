// routes/hotel.js — Booking on SHARED db.
import express from 'express';
import db from '../db.js';
import { logActivity } from '../auth.js';
const router = express.Router();
const I18N = { en:{booked:'Booked', rm:'Room', think:'intake'}, hi:{booked:'बुक', rm:'कमरा', think:'प्रवेश'}, ja:{booked:'予約', rm:'部屋', think:'受付'} };
function understand(t){ const L=(t||'').toLowerCase(); const room=(L.match(/deluxe|suite|standard|कमरा|部屋/)||[])[0]||'Standard'; const nights=parseInt(L.match(/(\d+)\s*(night|रात|泊)/)||[])[1]||1; return {room,nights}; }
function intake(text, locale){ const L=I18N[locale]||I18N.en; const u=understand(text);
  const id=db.prepare('INSERT INTO hotel_bookings (guest,room,nights,locale,channel,status,created_at) VALUES (?,?,?,?,?,?,?)')
    .run('Guest', u.room, u.nights, locale||'en','web','booked',Date.now()).lastInsertRowid;
  const steps=[{tool:'think',result:`(${L.think})`},{tool:'book',result:`${L.booked}: ${u.room}, ${u.nights} night(s) · ref #${id}`},{tool:'confirm',result:'Check-in link sent (demo).'}];
  return {id, steps}; }
router.post('/intake',(req,res)=>{ const {text,locale}=req.body||{}; const o=intake(text,locale); logActivity('hotel','🏨','Hotel booking',(text||'').slice(0,40)); res.json(o); });
router.get('/state',(_,res)=>{ const b=db.prepare("SELECT * FROM hotel_bookings ORDER BY id DESC LIMIT 20").all(); res.json({bookings:b}); });
export default router;
