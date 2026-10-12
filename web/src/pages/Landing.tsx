// src/pages/Landing.tsx — Public marketing page (no auth required).
import { useState } from 'react';
import { api } from '../lib/api';

const CONTACT_EMAIL = 'support@masystem.co.in';

const CAPABILITIES = [
  { ic: '🔎', t: 'Research & analysis', d: 'Gather information from sources and turn it into clear findings.' },
  { ic: '📄', t: 'Document understanding', d: 'Read, summarize and extract key points from long documents.' },
  { ic: '🧭', t: 'Multi-step task planning', d: 'Break a request into steps and carry them out in order.' },
  { ic: '🔌', t: 'Tools & API integration', d: 'Connect to external tools and services to get real work done.' },
  { ic: '✅', t: 'Human oversight', d: 'Important actions wait for a person to review and approve.' },
];

const ROADMAP = [
  { s: 'Idea', st: 'done', d: 'Product vision and target use case defined.' },
  { s: 'Prototype', st: 'now', d: 'Claude-powered agent for research, document analysis and structured outputs.' },
  { s: 'MVP', st: 'next', d: 'Validated with real users on one focused workflow.' },
  { s: 'Beta', st: 'next', d: 'Wider testing, tool integrations and approval controls.' },
];

export default function Landing() {
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
      setInterestNote('Thanks — we’ll be in touch.');
      setInterest({ name: '', email: '', company: '', phone: '' });
    } catch (error: any) { setInterestNote(error.message); }
    finally { setInterestBusy(false); }
  }

  const changeInterest = (field: keyof typeof interest) => (event: React.ChangeEvent<HTMLInputElement>) => setInterest(current => ({ ...current, [field]: event.target.value }));
  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '20px 6vw', maxWidth: 1200, margin: '0 auto' }}>
        <div className="brand"><span className="dot"></span><span>MA System</span></div>
        <nav className="row" style={{ gap: 16, fontSize: 14 }}>
          <a href="#product">Product</a><a href="#roadmap">Roadmap</a><a href="#technology">Technology</a><a href="#about">About</a><a href="#contact">Contact</a>
        </nav>
      </header>

      <section style={{ textAlign: 'center', padding: '60px 6vw 40px', animation: 'fadeSlideUp .6s ease both' }}>
        <div className="badge" style={{ marginBottom: 18 }}>Early-stage AI initiative · Based in India</div>
        <h1 style={{ fontSize: 'clamp(34px,6vw,60px)', fontWeight: 900, lineHeight: 1.05, background: 'var(--grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', marginBottom: 18 }}>
          Intelligent AI Agents for Everyday Work
        </h1>
        <p style={{ color: 'var(--text)', fontSize: 'clamp(16px,2.4vw,20px)', fontWeight: 700, maxWidth: 640, margin: '0 auto 12px' }}>
          Turning complex tasks into simpler, intelligent workflows.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 'clamp(15px,2.2vw,18px)', maxWidth: 680, margin: '0 auto 30px', lineHeight: 1.6 }}>
          MA System is an early-stage AI initiative exploring general-purpose AI agents that understand instructions, process information, and assist with multi-step tasks.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <a className="btn" href="#product">See what we're building</a>
          <a className="btn ghost" href="#roadmap" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>View roadmap →</a>
        </div>
      </section>

      <section id="product" style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 6vw' }}>
        <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 900, marginBottom: 8 }}>What we're building</h2>
        <p className="muted" style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 14px', fontSize: 14, lineHeight: 1.6 }}>
          An AI-agent platform that helps individuals and businesses automate repetitive work through natural-language interaction.
        </p>
        <div className="card" style={{ maxWidth: 760, margin: '0 auto 24px', border: '1px solid var(--brand)' }}>
          <div className="badge ok">Initial use case</div>
          <p style={{ marginTop: 10, lineHeight: 1.6 }}>An agent that <b>researches information</b>, <b>analyzes documents</b>, and <b>prepares structured outputs</b> — starting narrow, so it can be done reliably.</p>
        </div>
        <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginBottom: 14 }}>Planned capabilities</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {CAPABILITIES.map((f) => (
            <div key={f.t} className="card" style={{ margin: 0 }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{f.ic}</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{f.t}</div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="roadmap" style={{ maxWidth: 1000, margin: '40px auto', padding: '20px 6vw' }}>
        <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Roadmap</h2>
        <p className="muted" style={{ textAlign: 'center', marginBottom: 24, fontSize: 14 }}>Current stage: concept development and technical exploration.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
          {ROADMAP.map((r, i) => (
            <div key={r.s} className="stat" style={{ margin: 0, border: r.st === 'now' ? '1px solid var(--brand)' : undefined }}>
              <div className={r.st === 'next' ? 'badge' : 'badge ok'}>{r.st === 'done' ? 'Done' : r.st === 'now' ? 'In progress' : 'Planned'}</div>
              <div style={{ fontWeight: 800, fontSize: 17, margin: '10px 0 6px' }}>{i + 1}. {r.s}</div>
              <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{r.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="technology" style={{ maxWidth: 800, margin: '40px auto', padding: '20px 6vw', textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>Technology direction</h2>
        <p className="muted" style={{ lineHeight: 1.7 }}>
          We plan to build on Claude's language understanding, reasoning and tool-use capabilities as the foundation for reliable agent workflows — with Claude handling reasoning and task planning, and people approving important actions.
        </p>
      </section>

      <section id="hospital-demo" style={{ maxWidth: 1000, margin: '16px auto 40px', padding: '20px 6vw' }}>
        <div className="card" style={{ margin: 0, border: '1px solid var(--brand)' }}>
          <div className="badge ok">Early prototype sandbox · hospital reception</div>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: '14px 0 8px' }}>A first experiment: AI-assisted patient check-in</h2>
          <p className="muted" style={{ maxWidth: 680, lineHeight: 1.6 }}>One early experiment in applying agents to a real workflow. Try a sample patient request. This is a sandbox: it does not add anyone to a live hospital queue or retain patient information.</p>
          <textarea aria-label="Patient request for hospital demo" rows={3} value={demoText} onChange={event => setDemoText(event.target.value)} style={{ marginTop: 12 }} />
          <div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={runHospitalDemo} disabled={demoBusy}>{demoBusy ? 'Running demo…' : 'Run hospital demo'}</button></div>
          {demoError && <p style={{ color: 'var(--red)', marginTop: 10 }}>{demoError}</p>}
          {demoSteps.length > 0 && <div className="steps" style={{ marginTop: 14 }}>{demoSteps.map((step, index) => <div className="step" key={index}><span className="t">{step.tool}</span><span>{step.result}</span></div>)}</div>}

          <form onSubmit={submitInterest} style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
            <h3 style={{ marginBottom: 5 }}>Interested in following this experiment?</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Leave your details and we’ll be in touch as the prototype develops.</p>
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

      <section id="about" style={{ maxWidth: 800, margin: '40px auto', padding: '20px 6vw', textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>About MA System</h2>
        <p className="muted" style={{ lineHeight: 1.7 }}>
          MA System is an independent, early-stage AI project based in India, founded by MASystem. We are exploring how intelligent agents can make advanced automation more accessible to individuals and businesses. MA System is not yet a registered company, and the product is still in development.
        </p>
      </section>

      <section id="contact" style={{ maxWidth: 800, margin: '40px auto', padding: '20px 6vw', textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>Contact</h2>
        <p className="muted">Questions, feedback or collaboration ideas: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--brand)' }}>{CONTACT_EMAIL}</a></p>
      </section>

      <footer style={{ borderTop: '1px solid var(--line)', marginTop: 40, padding: '28px 6vw', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 8 }}><span className="dot"></span><span>MA System</span></div>
        <div><a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--brand)' }}>{CONTACT_EMAIL}</a></div>
        <div style={{ marginTop: 8, fontSize: 11, opacity: .7 }}>© {new Date().getFullYear()} MA System · Early-stage project, India</div>
      </footer>
    </div>
  );
}
