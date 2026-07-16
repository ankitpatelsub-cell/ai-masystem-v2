// src/components/ChatPanel.tsx — reusable agent chat with timeline bubbles + typing.
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export default function ChatPanel({ agent, icon, endpoint, examples, placeholder, langState }: {
  agent: string; icon?: string; endpoint: string; examples: string[]; placeholder: string; langState?: [string, (l: string) => void];
}) {
  const [hist, setHist] = useState<{ role: 'user' | 'agent' | 'typing'; icon?: string; text?: string; steps?: any[] }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = langState || useState('en');
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => { threadRef.current?.scrollTo(0, threadRef.current.scrollHeight); }, [hist]);

  async function send() {
    const t = input.trim(); if (!t || busy) return;
    setInput(''); setBusy(true);
    setHist(h => [...h, { role: 'user', text: t }, { role: 'typing' }]);
    try {
      const res: any = await api('POST', endpoint, { text: t, locale: lang, channel: 'web' });
      setHist(h => [...h.filter(m => m.role !== 'typing'), { role: 'agent', icon: agent, steps: res.steps || [], intent: res.intent, text: res.agent || res.answer }]);
    } catch (e: any) {
      setHist(h => [...h.filter(m => m.role !== 'typing'), { role: 'agent', icon: '⚠️', text: e.message }]);
    } finally { setBusy(false); }
  }

  function renderMsg(m: any) {
    if (m.role === 'typing') return <div className="msg typing"><div className="av">{(icon || agent)}</div><div className="bubble">thinking…</div></div>;
    if (m.role === 'user') return <div className="msg user"><div className="av" style={{ background: 'var(--grad)' }}>You</div><div className="bubble">{m.text}</div></div>;
    return <div className="msg"><div className="av">{m.icon || icon || '🤖'}</div><div className="bubble">
      {m.text && <div>{m.text}</div>}
      {m.steps && <div className="steps">{m.steps.map((s: any, i: number) => <div className="step" key={i}><span className="t">{s.tool}</span><span>{String(s.result)}</span></div>)}</div>}
    </div></div>;
  }

  return (
    <div className="card">
      <div className="row">
        {examples.map(e => <button key={e} className="chip" onClick={() => setInput(e)}>{e}</button>)}
        <div className="langsel">
          {['en', 'hi', 'ja'].map(l => <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>{l === 'en' ? 'EN' : l === 'hi' ? 'HI' : '日本'}</button>)}
        </div>
      </div>
      <textarea rows={2} value={input} placeholder={placeholder} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} style={{ marginTop: 10 }} />
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn" onClick={send} disabled={busy}>Send</button>
      </div>
      <div className="thread" ref={threadRef}>
        {hist.length === 0 && <div className="muted">Try an example above to talk to the agent.</div>}
        {hist.map((m, i) => <div key={i}>{renderMsg(m)}</div>)}
      </div>
    </div>
  );
}
