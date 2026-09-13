// src/pages/Landing.tsx — Public marketing page (no auth required).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const FEATURES = [
  { ic: '🏥', t: 'Hospital Reception AI', d: 'Auto patient intake, queue & surge alerts in EN/JA/HI.' },
  { ic: '🏨', t: 'Hotel Concierge AI', d: 'Bookings, FAQs & multilingual guest handoff 24/7.' },
  { ic: '🦷', t: 'Dental Front-Desk AI', d: 'Appointment booking & reminders that cut no-shows.' },
  { ic: '📣', t: 'Outbound SDR', d: 'Claude drafts & sends 5-min-demo emails to hot leads.' },
  { ic: '⭐', t: 'Review Management', d: 'AI-written responses to Google / Booking / Zomato.' },
  { ic: '⏰', t: 'Reminders / No-Show', d: 'WhatsApp / LINE / email appointment nudges.' },
  { ic: '🌐', t: 'Multilingual (JP/EN)', d: 'Live translate & handoff for the Japan market.' },
  { ic: '💳', t: 'Billing & Payments', d: 'Invoices + UPI / PayPay collection reminders.' },
];

const STEPS = [
  { n: '1', t: 'Connect', d: 'Plug the agent into your front desk, website or WhatsApp in minutes.' },
  { n: '2', t: 'Automate', d: 'It handles intake, bookings, reminders & outreach around the clock.' },
  { n: '3', t: 'Grow', d: 'Owners get a weekly KPI digest; you focus on the patient, not the phone.' },
];

export default function Landing() {
  const nav = useNavigate();
  const [demoText, setDemoText] = useState('My name is Anita, I have a fever since this morning');
  const [demoSteps, setDemoSteps] = useState<any[]>([]);
  const [demoError, setDemoError] = useState('');
  const [demoBusy, setDemoBusy] = useState(false);
  const [interest, setInterest] = useState({ name: '', email: '', company: '', phone: '' });
  const [interestNote, setInterestNote] = useState('');
  const [interestBusy, setInterestBusy] = useState(false);

  async function runHospitalDemo() {
    setDemoBusy(true); setDemoError('');
    try { const result: any = await api('POST', '/api/hospital/demo', { text: demoText }); setDemoSteps(result.steps || []); }
    catch (error: any) { setDemoError(error.message); setDemoSteps([]); }
    finally { setDemoBusy(false); }
  }

  async function submitInterest(event: React.FormEvent) {
    event.preventDefault(); setInterestBusy(true); setInterestNote('');
    try {
      await api('POST', '/api/leads', { ...interest, interest: 'hospital', source: 'hospital_demo', message: 'Hospital demo interest from public landing page.' });
      setInterestNote('Thanks — our team will contact you about a hospital demo.');
      setInterest({ name: '', email: '', company: '', phone: '' });
    } catch (error: any) { setInterestNote(error.message); }
    finally { setInterestBusy(false); }
  }

  const changeInterest = (field: keyof typeof interest) => (event: React.ChangeEvent<HTMLInputElement>) => setInterest(current => ({ ...current, [field]: event.target.value }));
  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '20px 6vw', maxWidth: 1200, margin: '0 auto' }}>
        <div className="brand"><span className="dot"></span><span>MASystem</span></div>
      </header>

      <section style={{ textAlign: 'center', padding: '60px 6vw 40px', animation: 'fadeSlideUp .6s ease both' }}>
        <div className="badge ok" style={{ marginBottom: 18 }}>● AI agents for Indian business · 24/7</div>
        <h1 style={{ fontSize: 'clamp(34px,6vw,60px)', fontWeight: 900, lineHeight: 1.05, background: 'var(--grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', marginBottom: 18 }}>
          AI agents that run your front desk
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 'clamp(15px,2.2vw,19px)', maxWidth: 640, margin: '0 auto 30px', lineHeight: 1.6 }}>
          MASystem is a multi-agent platform that handles patient intake, hotel concierge, outreach and reviews — automating the busywork so your team talks to people, not phones.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <a className="btn" href="#hospital-demo">🏥 Try hospital demo</a>
          <button className="btn ghost" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }} onClick={() => nav('/hospital/book')}>Book a hospital visit →</button>
          <button className="btn ghost" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }} onClick={() => nav('/login')}>Login to dashboard →</button>
        </div>
      </section>

      <section id="hospital-demo" style={{ maxWidth: 1000, margin: '16px auto 40px', padding: '20px 6vw' }}>
        <div className="card" style={{ margin: 0, border: '1px solid var(--brand)' }}>
          <div className="badge ok">🏥 Interactive hospital reception demo</div>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: '14px 0 8px' }}>See a patient check-in in seconds</h2>
          <p className="muted" style={{ maxWidth: 680, lineHeight: 1.6 }}>Try a sample patient request. This is a sandbox: it does not add anyone to a live hospital queue or retain patient information.</p>
          <textarea aria-label="Patient request for hospital demo" rows={3} value={demoText} onChange={event => setDemoText(event.target.value)} style={{ marginTop: 12 }} />
          <div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={runHospitalDemo} disabled={demoBusy}>{demoBusy ? 'Running demo…' : 'Run hospital demo'}</button></div>
          {demoError && <p style={{ color: 'var(--red)', marginTop: 10 }}>{demoError}</p>}
          {demoSteps.length > 0 && <div className="steps" style={{ marginTop: 14 }}>{demoSteps.map((step, index) => <div className="step" key={index}><span className="t">{step.tool}</span><span>{step.result}</span></div>)}</div>}

          <form onSubmit={submitInterest} style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
            <h3 style={{ marginBottom: 5 }}>Interested in this for your hospital?</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Leave your details and we’ll arrange a tailored walkthrough.</p>
            <div className="row">
              <input aria-label="Your name" required placeholder="Your name" value={interest.name} onChange={changeInterest('name')} />
              <input aria-label="Work email" required type="email" placeholder="Work email" value={interest.email} onChange={changeInterest('email')} />
              <input aria-label="Hospital or clinic" placeholder="Hospital or clinic" value={interest.company} onChange={changeInterest('company')} />
              <input aria-label="Phone number" placeholder="Phone number (optional)" value={interest.phone} onChange={changeInterest('phone')} />
              <button className="btn" disabled={interestBusy}>{interestBusy ? 'Sending…' : 'Request hospital demo'}</button>
            </div>
            {interestNote && <p className="muted" style={{ color: interestNote.startsWith('Thanks') ? 'var(--ok)' : 'var(--red)', marginTop: 10 }}>{interestNote}</p>}
          </form>
        </div>
      </section>

      <section style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', padding: '10px 6vw 40px' }}>
        {[['235+', 'Real leads engaged'], ['11', 'Production AI agents'], ['4', 'Industry verticals']].map(([v, k]) => (
          <div key={k} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 900, background: 'var(--grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{v}</div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{k}</div>
          </div>
        ))}
      </section>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 6vw' }}>
        <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 900, marginBottom: 8 }}>One AI layer for your whole front desk</h2>
        <p className="muted" style={{ textAlign: 'center', marginBottom: 28, fontSize: 14 }}>Purpose-built agents, orchestrated — not a generic bot platform.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.t} className="card" style={{ margin: 0, animation: 'fadeSlideUp .5s ease both' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{f.ic}</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{f.t}</div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1000, margin: '40px auto', padding: '20px 6vw' }}>
        <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 900, marginBottom: 28 }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          {STEPS.map((s) => (
            <div key={s.n} className="stat" style={{ margin: 0 }}>
              <div style={{ fontSize: 34, fontWeight: 900, background: 'var(--grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{s.n}</div>
              <div style={{ fontWeight: 800, fontSize: 17, margin: '8px 0 6px' }}>{s.t}</div>
              <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--line)', marginTop: 40, padding: '28px 6vw', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 8 }}><span className="dot"></span><span>MASystem</span></div>
        <div><a href="mailto:admin.ai.masystem@gmail.com" style={{ color: 'var(--brand)' }}>admin.ai.masystem@gmail.com</a></div>
        <div style={{ marginTop: 8, fontSize: 11, opacity: .7 }}>© {new Date().getFullYear()} AI MASystem. All rights reserved.</div>
      </footer>
    </div>
  );
}
