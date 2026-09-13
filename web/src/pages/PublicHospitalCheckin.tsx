import { useSearchParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../lib/api';

export default function PublicHospitalCheckin() {
  const [params] = useSearchParams(); const code = params.get('code') || ''; const [result, setResult] = useState<any>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [qr, setQr] = useState('');
  useEffect(() => { if (!code) return; QRCode.toDataURL(`${window.location.origin}/hospital/check-in?code=${encodeURIComponent(code)}`, { width: 220, margin: 1, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr('')); }, [code]);
  async function checkIn() { setBusy(true); setError(''); try { const response: any = await api('POST', `/api/hospital/public/bookings/${encodeURIComponent(code)}/check-in`); setResult(response.appointment); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
  return <div style={{ minHeight: '100vh', padding: '28px 6vw', maxWidth: 640, margin: '0 auto' }}><div className="brand" style={{ marginBottom: 30 }}><span className="dot"></span><span>MASystem Hospital</span></div><div className="card"><h1>Appointment check-in</h1>{!code ? <p style={{ color: 'var(--red)' }}>A valid check-in link is required.</p> : result ? <div className="bubble"><h3>Checked in successfully</h3><p>Queue number: <b>#{result.queue_number}</b></p><p>Estimated wait: <b>{result.estimated_wait_min} minutes</b></p><p className="muted">Please wait for your turn alert and follow reception instructions.</p></div> : <><p className="muted">Use this pass only when you arrive at the hospital. Reception can scan the code or open this link.</p>{qr && <img src={qr} alt="Check-in QR code" width={220} height={220} style={{ display: 'block', background: 'white', padding: 8, borderRadius: 8, margin: '16px 0' }} />}{error && <p style={{ color: 'var(--red)' }}>{error}</p>}<button className="btn" onClick={checkIn} disabled={busy}>{busy ? 'Checking in…' : 'Check in now'}</button></>}<div style={{ marginTop: 18 }}><Link to="/hospital/book">← Book an appointment</Link></div></div></div>;
}
