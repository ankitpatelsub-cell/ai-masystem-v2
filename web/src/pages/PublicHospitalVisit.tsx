import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

const time = (value?: number) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'To be confirmed';

export default function PublicHospitalVisit() {
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [appointment, setAppointment] = useState<any>(null);
  const [error, setError] = useState('');
  async function lookup(value = code) {
    if (!value.trim()) return;
    setError('');
    try {
      const result: any = await api('GET', `/api/hospital/public/bookings/${encodeURIComponent(value.trim())}`);
      setAppointment(result.appointment); setCode(value.trim()); setParams({ code: value.trim() });
    } catch (e: any) { setAppointment(null); setError(e.message); }
  }
  useEffect(() => { if (params.get('code')) lookup(params.get('code') || ''); }, []);
  return <div style={{ minHeight: '100vh', padding: '28px 6vw', maxWidth: 780, margin: '0 auto' }}><div className="brand" style={{ marginBottom: 30 }}><span className="dot"/><span>MASystem Hospital</span></div><div className="card"><h1>Manage your visit</h1><p className="muted">Enter your booking code to find the appointment. Personal details and changes require one-time-code verification in the secure hospital portal.</p><div className="row"><input aria-label="Booking code" placeholder="APT-XXXXXX" value={code} onChange={e => setCode(e.target.value.toUpperCase())}/><button className="btn" onClick={() => lookup()}>Find booking</button></div>{error && <p style={{ color: 'var(--red)' }}>{error}</p>}{appointment && <div className="bubble" style={{ marginTop: 18 }}><h3>{appointment.status === 'waitlisted' ? 'Waitlist request' : 'Your appointment'}</h3><p><b>{appointment.doctor_name}</b> · {appointment.specialty}</p><p>{time(appointment.starts_at)} · {appointment.location}</p><p>Status: <span className="pill">{appointment.status}</span></p><a className="btn" href={`/hospital-site/manage?code=${encodeURIComponent(code)}`} style={{ display:'inline-block', marginTop:10 }}>Verify and manage securely</a></div>}<div style={{ marginTop: 22 }}><Link to="/hospital/book">← Book a new appointment</Link></div></div></div>;
}
