// migrate.js — import existing agent data into shared v2 DB.
import Database from 'better-sqlite3';
import db from './db.js'; // import first to ensure schema exists
const OLD_CAR = '/root/car-agent/dealership.db';
const OLD_HOSP = '/root/hospital-agent/hospital.db';
const OLD_HOTEL = '/root/hotel-agent/hotel.db';

const oldCar = new Database(OLD_CAR, { readonly: true, fileMustExist: false });
const oldHosp = new Database(OLD_HOSP, { readonly: true, fileMustExist: false });
const oldHotel = new Database(OLD_HOTEL, { readonly: true, fileMustExist: false });

function q(d, sql) { try { return d.prepare(sql).all(); } catch { return []; } }

const cars = q(oldCar, "SELECT brand,model,year,fuel,km,price,city FROM cars WHERE status='available'");
let ci = 0;
for (const c of cars) { db.prepare("INSERT OR IGNORE INTO car_cars (brand,model,year,fuel,km,price,city) VALUES (?,?,?,?,?,?,?)").run(c.brand,c.model,c.year,c.fuel,c.km,c.price,c.city); ci++; }

const hb = q(oldHosp, "SELECT name,complaint,locale,channel,position,eta_min,status,created_at FROM queue WHERE status='waiting'");
let hi = 0;
for (const r of hb) { db.prepare("INSERT INTO hospital_queue (name,complaint,locale,channel,position,eta_min,status,created_at) VALUES (?,?,?,?,?,?,?,?)").run(r.name,r.complaint||'',r.locale||'en',r.channel||'web',r.position,r.eta_min,r.status,r.created_at||Date.now()); hi++; }

const ht = q(oldHotel, "SELECT guest,room,nights,locale,channel,status,created_at FROM bookings");
let ti = 0;
for (const r of ht) { db.prepare("INSERT INTO hotel_bookings (guest,room,nights,locale,channel,status,created_at) VALUES (?,?,?,?,?,?,?)").run(r.guest||'Guest',r.room,r.nights,r.locale||'en',r.channel||'web',r.status||'booked',r.created_at||Date.now()); ti++; }

console.log(`Imported: cars=${ci}, hospital_waiting=${hi}, hotel_bookings=${ti}`);
