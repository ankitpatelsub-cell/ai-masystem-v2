// routes/car.js — Car Sales assistant on the SHARED db.
import express from 'express';
import db from '../db.js';
import { requireAuth, logActivity } from '../auth.js';

const router = express.Router();

const I18N = {
  en: { onroad: 'On-road price', exchange: 'Exchange offer', used: 'Used cars', think: 'thinking' },
  hi: { onroad: 'ऑन-रोड कीमत', exchange: 'एक्सचेंज ऑफर', used: 'पुरानी कारें', think: 'सोच रहा हूँ' },
  ja: { onroad: '支払総額', exchange: '下取り提案', used: '中古車', think: '考え中' },
};

function parseIntent(t) {
  t = (t || '').toLowerCase();
  if (/exchange|trade|下取り|バイバック/.test(t)) return 'exchange';
  if (/used|second|old|पुरानी|中古/.test(t)) return 'used';
  if (/emi|loan|किस्त|ローン/.test(t)) return 'emi';
  if (/price|onroad|on-road|कीमत|価格|लागत/.test(t)) return 'newcar';
  return 'info';
}

function run(text, channel, locale) {
  const L = I18N[locale] || I18N.en;
  const steps = [];
  const intent = parseIntent(text);
  const priceM = (text.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|l|cr|c)?/i) || []);
  const exLakh = priceM[1] ? parseFloat(priceM[1]) * (/cr|c/i.test(priceM[2] || '') ? 100 : 1) : 8;

  if (intent === 'newcar' || intent === 'info') {
    const rto = exLakh * 0.09, ins = exLakh * 0.04;
    const total = exLakh + rto + ins;
    steps.push({ tool: 'onroad', result: `${L.onroad}: ₹${exLakh}L ex → ₹${total.toFixed(2)}L (RTO ₹${rto.toFixed(2)}L, insurance ₹${ins.toFixed(2)}L)` });
    const stock = db.prepare("SELECT brand,model,price FROM car_cars WHERE status='available' ORDER BY price LIMIT 3").all();
    if (stock.length) steps.push({ tool: 'suggest', result: 'Options: ' + stock.map(c => `${c.brand} ${c.model} (₹${(c.price/1e5).toFixed(1)}L)`).join(', ') });
  } else if (intent === 'exchange') {
    const yr = (text.match(/20(\d{2})/) || [])[0] || '2019';
    const km = (text.match(/(\d{4,6})\s*(km|kms)?/i) || [])[1] || '40000';
    const credit = (exLakh * 0.38).toFixed(2);
    steps.push({ tool: 'exchange', result: `${L.exchange}: old car ${yr} (~${km}km) ≈ ₹${credit}L credit → new on-road ₹${(exLakh*1.14).toFixed(2)}L` });
  } else if (intent === 'used') {
    steps.push({ tool: 'used', result: `${L.used}: certified stock coming soon — subscribe for alerts.` });
  } else if (intent === 'emi') {
    steps.push({ tool: 'emi', result: `EMI for ₹${exLakh}L @9% /5yr ≈ ₹${Math.round(exLakh*1e5*0.0208)}/mo.` });
  }
  db.prepare('INSERT INTO car_leads (text,channel,intent,locale) VALUES (?,?,?,?)').run(text, channel || 'web', intent, locale || 'en');
  return { intent, locale, steps };
}

router.post('/chat', (req, res) => {
  const { text, channel, locale } = req.body || {};
  const out = run(text, channel, locale);
  logActivity('car', '🚗', 'Car enquiry', (text || '').slice(0, 40));
  res.json(out);
});
router.get('/cars', (_, res) => res.json(db.prepare("SELECT * FROM car_cars WHERE status='available' ORDER BY price").all()));
router.post('/cars', requireAuth(['admin', 'staff']), (req, res) => {
  const c = req.body || {};
  const id = db.prepare('INSERT INTO car_cars (brand,model,year,fuel,km,price,city) VALUES (?,?,?,?,?,?,?)')
    .run(c.brand, c.model, c.year, c.fuel, c.km, c.price, c.city).lastInsertRowid;
  res.json({ id });
});

export default router;
