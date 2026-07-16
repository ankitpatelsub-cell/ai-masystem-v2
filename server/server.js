// server.js — Express backend for AI MASystem v2 (React served as static build).
import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
import db from './db.js';
import { authRouter, requireAuth } from './auth.js';
import car from './routes/car.js';
import hospital from './routes/hospital.js';
import hotel from './routes/hotel.js';
import manager from './routes/manager.js';
import backoffice from './routes/backoffice.js';
import reels from './routes/reels.js';
import leads from './routes/leads.js';
import settings from './routes/settings.js';
import users from './routes/users.js';
import permissions from './routes/permissions.js';

const app = express();
app.use(express.json());

// Mount all agent APIs under /api/<agent>
app.use('/api/auth', authRouter);
app.use('/api/car', car);
app.use('/api/hospital', hospital);
app.use('/api/hotel', hotel);
app.use('/api/manager', manager);
app.use('/api/backoffice', backoffice);
app.use('/api/reels', reels);
app.use('/api/leads', leads);
app.use('/api/settings', settings);
app.use('/api/users', users);
app.use('/api/permissions', permissions);

// Aggregate status (secret-free, safe for dashboard)
app.get('/api/status', (_,res)=>{
  const stats = {
    car: db.prepare("SELECT COUNT(*) c FROM car_cars WHERE status='available'").get().c,
    hospital: db.prepare("SELECT COUNT(*) c FROM hospital_queue WHERE status='waiting'").get().c,
    hotel: db.prepare("SELECT COUNT(*) c FROM hotel_bookings").get().c,
    leads: db.prepare("SELECT COUNT(*) c FROM leads").get().c,
  };
  res.json({ ok:true, agents:6, stats, provider: process.env.MODEL_PROVIDER||'claude' });
});

// Activity feed (staff)
app.get('/api/activity', requireAuth(['admin','staff','viewer']), (_,res)=>{
  res.json(db.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT 30').all());
});

// Serve React build (web/dist)
const DIST = path.join(process.cwd(), '..', 'web', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^(?!\/api).*/, (req, res) => { res.sendFile(path.join(DIST, 'index.html')); });
}

const PORT = process.env.PORT || 8099;
app.listen(PORT, '0.0.0.0', ()=>console.log('AI MASystem v2 on '+PORT));
