import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const today = () => new Date().toISOString().slice(0, 10);
const formatTime = (timestamp: number) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));

export default function PublicHospitalBooking() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(today());
  const [slots, setSlots] = useState<any[]>([]);
  const [slotId, setSlotId] = useState('');
  const [form, setForm] = useState({ patientName: '', phone: '', email: '', reason: '', abhaNumber: '', abhaConsent: false, joinWaitlist: true });
  const [result, setResult] = useState<any>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => { api('GET', '/api/hospital/public/doctors').then((rows: any) => { setDoctors(rows); if (rows[0]) setDoctorId(String(rows[0].id)); }).catch(e => setError(e.message)); }, []);
  useEffect(() => { if (!doctorId) return; setSlotId(''); api('GET', `/api/hospital/public/slots?doctorId=${doctorId}&date=${date}`).then((rows: any) => setSlots(rows)).catch(e => setError(e.message)); }, [doctorId, date]);
  const field = (name: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(current => ({ ...current, [name]: event.target.type === 'checkbox' ? (event.target as HTMLInputElement).checked : event.target.value }));
  async function book(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    try { const response: any = await api('POST', '/api/hospital/public/bookings', { ...form, doctorId: Number(doctorId), slotId: Number(slotId) }); setResult(response); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <div style={{ minHeight: '100vh', padding: '28px 6vw', maxWidth: 960, margin: '0 auto' }}>
    <div className="brand" style={{ marginBottom: 30 }}><span className="dot"></span><span>MASystem Hospital</span></div>
    <div className="card"><div className="badge ok">Online appointment booking</div><h1 style={{ marginTop: 14 }}>Book a hospital visit</h1><p className="muted">Choose a doctor and time. You’ll receive a booking code and a check-in link. For urgent or emergency care, contact your local emergency service.</p>
      {result ? <div className="bubble" style={{ marginTop: 16 }}><h3>{result.appointment.status === 'waitlisted' ? 'You are on the waitlist' : 'Appointment confirmed'}</h3><p>Booking code: <b>{result.appointment.booking_code}</b></p><p>{result.appointment.doctor_name} · {new Date(result.appointment.starts_at).toLocaleString()}</p>{result.appointment.status === 'confirmed' && <Link className="btn" to={result.checkinUrl}>Open check-in pass →</Link>}<Link className="chip" style={{ marginLeft: 8 }} to={result.manageUrl}>Manage visit</Link><button className="chip" style={{ marginLeft: 8 }} onClick={() => setResult(null)}>Book another</button></div> : <form onSubmit={book}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginTop: 18 }}>
          <label>Doctor<select aria-label="Doctor" value={doctorId} onChange={e => setDoctorId(e.target.value)}>{doctors.map(d => <option value={d.id} key={d.id}>{d.name} — {d.specialty}</option>)}</select></label>
          <label>Date<input aria-label="Appointment date" type="date" min={today()} value={date} onChange={e => setDate(e.target.value)} /></label>
        </div>
        <div style={{ marginTop: 16 }}><b>Available time</b><div className="row" style={{ marginTop: 8 }}>{slots.map(slot => <button type="button" className={`chip ${slotId === String(slot.id) ? 'on' : ''}`} key={slot.id} onClick={() => setSlotId(String(slot.id))} disabled={slot.available < 1}>{formatTime(slot.starts_at)} {slot.available > 1 ? `(${slot.available})` : ''}</button>)}</div>{slots.length === 0 && <p className="muted">No slots are available for this day.</p>}</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginTop: 16 }}>
          <label>Patient name<input aria-label="Patient name" required value={form.patientName} onChange={field('patientName')} /></label>
          <label>Phone<input aria-label="Patient phone" required value={form.phone} onChange={field('phone')} /></label>
          <label>Email (optional)<input aria-label="Patient email" type="email" value={form.email} onChange={field('email')} /></label>
          <label>ABHA number (optional)<input aria-label="ABHA number" value={form.abhaNumber} onChange={field('abhaNumber')} /></label>
        </div>
        <label style={{ display: 'block', marginTop: 14 }}>Reason for visit<textarea aria-label="Reason for visit" rows={2} value={form.reason} onChange={field('reason')} /></label>
        <label style={{ display: 'block', marginTop: 12 }}><input type="checkbox" checked={form.abhaConsent} onChange={field('abhaConsent')} /> I consent to use this optional ABHA number for this booking. It is not validated by this demo.</label>
        <label style={{ display: 'block', marginTop: 8 }}><input type="checkbox" checked={form.joinWaitlist} onChange={field('joinWaitlist')} /> Join the waitlist if this slot fills before confirmation.</label>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}<button className="btn" disabled={!slotId || busy} style={{ marginTop: 16 }}>{busy ? 'Booking…' : 'Confirm appointment'}</button>
      </form>}
    </div>
  </div>;
}
