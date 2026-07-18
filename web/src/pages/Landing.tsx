// src/pages/Landing.tsx — Public marketing page (no auth required).
import { useNavigate } from 'react-router-dom';

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
  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 6vw', maxWidth: 1200, margin: '0 auto' }}>
        <div className="brand"><span className="dot"></span><span>MASystem</span></div>
        <button className="btn ghost" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }} onClick={() => nav('/login')}>Login →</button>
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
          <a className="btn" href="mailto:admin.ai.masystem@gmail.com?subject=AI%20agent%20demo%20request" onClick={(e) => { e.preventDefault(); window.location.href = 'mailto:admin.ai.masystem@gmail.com?subject=AI%20agent%20demo%20request'; }}>📩 Request a demo</a>
          <button className="btn ghost" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }} onClick={() => nav('/login')}>Login to dashboard →</button>
        </div>
      </section>

      <section style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', padding: '10px 6vw 40px' }}>
        {[['235+', 'Real leads engaged'], ['11', 'Production AI agents'], ['2', 'Markets: JP ⇄ IN']].map(([v, k]) => (
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
        <div>Nihon Offshore · AI agents for India & Japan · <a href="mailto:admin.ai.masystem@gmail.com" style={{ color: 'var(--brand)' }}>admin.ai.masystem@gmail.com</a></div>
        <div style={{ marginTop: 8, fontSize: 11, opacity: .7 }}>© {new Date().getFullYear()} AI MASystem. All rights reserved.</div>
      </footer>
    </div>
  );
}
