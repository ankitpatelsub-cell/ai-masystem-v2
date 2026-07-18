// src/pages/TranslatePage.tsx — Multilingual JP/EN handoff.
import { useState } from 'react';
import { api } from '../lib/api';

export default function TranslatePage() {
  const [text, setText] = useState('こんにちは、予約をしたいです。');
  const [to, setTo] = useState('en');
  const [out, setOut] = useState('');
  const [lang, setLang] = useState('');
  const [note, setNote] = useState('');
  async function translate() {
    setNote('Translating…');
    const d = await api('POST', '/api/translate/translate', { text, to });
    setOut(d.translated); setNote('');
  }
  async function detect() {
    setNote('Detecting…');
    const d = await api('POST', '/api/translate/detect', { text });
    setLang(d.lang); setNote('');
  }
  return (
    <><div className="top"><div><h1>🌐 Translate</h1><div className="sub">Multilingual handoff — JP↔EN, HI/GU↔EN for the Japan market & Gujarat beachhead</div></div></div>
      <div className="card">
        {note && <div className="muted" style={{ color: 'var(--brand)', marginBottom: 10 }}>{note}</div>}
        <textarea rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="Paste message to translate…" />
        <div className="row" style={{ marginTop: 10 }}>
          <select value={to} onChange={e => setTo(e.target.value)} style={{ width: 120 }}>
            <option value="en">→ English</option><option value="ja">→ Japanese</option><option value="hi">→ Hindi</option><option value="gu">→ Gujarati</option>
          </select>
          <button className="btn" onClick={translate}>🌐 Translate</button>
          <button className="btn ghost" onClick={detect}>🔎 Detect language</button>
          {lang && <span className="badge ok">detected: {lang}</span>}
        </div>
        {out && <div style={{ marginTop: 12, padding: 12, background: 'var(--bg2)', borderRadius: 10, lineHeight: 1.6 }}>{out}</div>}
      </div>
    </>
  );
}
