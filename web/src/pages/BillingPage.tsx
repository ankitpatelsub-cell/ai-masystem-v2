// src/pages/BillingPage.tsx — Billing / invoicing & payment collection.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const load = () => api('GET', '/api/billing').then((d: any) => setInvoices(d.invoices)).catch(e => setNote(e.message));
  useEffect(() => { load(); }, []);
  async function add() {
    const business = prompt('Business name?') || 'Hotel Grand';
    const amount = parseFloat(prompt('Amount (INR)?') || '15000');
    await api('POST', '/api/billing/invoice', { business, amount, currency: 'INR' });
    setNote('Invoice created.'); load();
  }
  async function remind(id: number) {
    setNote('Sending payment reminder…');
    const d = await api('POST', `/api/billing/${id}/remind`);
    setNote(`#${id}: ${d.result}`); load();
  }
  return (
    <><div className="top"><div><h1>💳 Billing</h1><div className="sub">Invoicing & payment collection — UPI (India) / PayPay (Japan) reminders</div></div></div>
      <div className="card">
        {note && <div className="muted" style={{ color: 'var(--brand)', marginBottom: 10 }}>{note}</div>}
        <button className="btn" onClick={add} style={{ marginBottom: 14 }}>+ New invoice</button>
        <table>
          <thead><tr><th>#</th><th>Business</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>{invoices.map((i: any) => <tr key={i.id}><td>{i.id}</td><td><b>{i.business}</b></td><td>{i.amount} {i.currency}</td><td>{i.status}</td><td><button className="btn" disabled={i.reminder_sent} onClick={() => remind(i.id)}>{i.reminder_sent ? '✓' : 'Remind'}</button></td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
