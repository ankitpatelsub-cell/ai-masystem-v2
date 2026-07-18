// src/pages/ReminderPage.tsx — No-show reduction / appointment reminders.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function ReminderPage() {
  const [appts, setAppts] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const load = () => api('GET', '/api/reminder').then((d: any) => setAppts(d.appts)).catch(e => setNote(e.message));
  useEffect(() => { load(); }, []);
  async function add() {
    const name = prompt('Patient/guest name?') || 'Test Patient';
    await api('POST', '/api/reminder/appointment', { name, email: 'admin.ai.masystem@gmail.com', channel: 'whatsapp' });
    setNote('Appointment added.'); load();
  }
  async function send(id: number) {
    setNote('Sending reminder…');
    const d = await api('POST', `/api/reminder/${id}/send`);
    setNote(`#${id}: ${d.result}`); load();
  }
  async function runAll() {
    setNote('Sending all due reminders…');
    const d = await api('POST', '/api/reminder/run');
    setNote(`Sent ${d.sent} reminders.`); load();
  }
  return (
    <><div className="top"><div><h1>⏰ Reminders</h1><div className="sub">No-show reduction — appointment reminders via WhatsApp/LINE/email (pluggable sender)</div></div></div>
      <div className="card">
        {note && <div className="muted" style={{ color: 'var(--brand)', marginBottom: 10 }}>{note}</div>}
        <div className="row" style={{ marginBottom: 14 }}>
          <button className="btn" onClick={add}>+ Add appointment</button>
          <button className="btn ghost" onClick={runAll}>📨 Send due reminders</button>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>When</th><th>Channel</th><th>Status</th><th></th></tr></thead>
          <tbody>{appts.map((a: any) => <tr key={a.id}><td><b>{a.name}</b></td><td>{a.type}</td><td>{new Date(a.appt_at*1000).toLocaleString()}</td><td>{a.channel}</td><td>{a.status}</td><td><button className="btn" disabled={a.reminder_sent} onClick={() => send(a.id)}>{a.reminder_sent ? '✓' : 'Send'}</button></td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
