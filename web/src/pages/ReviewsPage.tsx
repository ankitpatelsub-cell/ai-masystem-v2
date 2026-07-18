// src/pages/ReviewsPage.tsx — Review & reputation management.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const load = () => api('GET', '/api/reviews').then((d: any) => setReviews(d.reviews)).catch(e => setNote(e.message));
  useEffect(() => { load(); }, []);
  async function add() {
    const business = prompt('Business name?') || 'Hotel Grand';
    await api('POST', '/api/reviews', { business, platform: 'google', rating: 4, text: 'Great stay but WiFi was slow.' });
    setNote('Review added.'); load();
  }
  async function respond(id: number) {
    setNote('Drafting response…');
    const d = await api('POST', `/api/reviews/${id}/respond`);
    setNote(`#${id}: ${d.draft?.slice(0,60)}…`); load();
  }
  async function runAll() {
    setNote('Drafting all pending responses…');
    const d = await api('POST', '/api/reviews/run');
    setNote(`Drafted ${d.drafted}.`); load();
  }
  return (
    <><div className="top"><div><h1>⭐ Reviews</h1><div className="sub">Reputation agent — drafts professional responses to Google/Booking/Zomato reviews</div></div></div>
      <div className="card">
        {note && <div className="muted" style={{ color: 'var(--brand)', marginBottom: 10 }}>{note}</div>}
        <div className="row" style={{ marginBottom: 14 }}>
          <button className="btn" onClick={add}>+ Add review</button>
          <button className="btn ghost" onClick={runAll}>✍️ Draft all pending</button>
        </div>
        {reviews.length === 0 ? <div className="muted">No reviews yet.</div> :
          reviews.map((r: any) => (
            <div key={r.id} style={{ borderBottom: '1px solid var(--line)', padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{r.business}</b><span className="muted">{r.platform} · {r.rating}★ · {r.status}</span></div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>“{r.text}”</div>
              {r.response_draft && <div style={{ marginTop: 6, padding: 8, background: 'var(--bg2)', borderRadius: 8, fontSize: 13 }}>{r.response_draft}</div>}
              <button className="btn" style={{ marginTop: 8 }} disabled={!!r.response_draft} onClick={() => respond(r.id)}>{r.response_draft ? '✓ Drafted' : '✍️ Respond'}</button>
            </div>
          ))}
      </div>
    </>
  );
}
