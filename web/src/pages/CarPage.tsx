// src/pages/CarPage.tsx
import { useState } from 'react';
import ChatPanel from '../components/ChatPanel';
import { api } from '../lib/api';

export default function CarPage() {
  const [cars, setCars] = useState<any[]>([]); const [lang, setLang] = useState('en');
  const load = () => api('GET', '/api/car/cars').then(setCars).catch(() => {});
  (function () { if (!cars.length) load(); })();
  return (
    <>
      <div className="top"><div><h1>🚗 Car Sales Agent</h1><div className="sub">On-road price · exchange · EMI · test-drive leads</div></div></div>
      <ChatPanel agent="🚗" endpoint="/api/car/chat" langState={[lang, setLang]}
        examples={['on-road price of Creta 12 lakh', 'exchange my 2020 Honda City 40000km', 'used cars under 8 lakh', 'EMI for 10 lakh']}
        placeholder="Ask about a car…" />
      <div className="card"><h3>Live stock ({cars.length})</h3>
        <table><thead><tr><th>Car</th><th>Year</th><th>Fuel</th><th>Price</th></tr></thead>
          <tbody>{cars.slice(0, 10).map(c => <tr key={c.id}><td><b>{c.brand} {c.model}</b></td><td>{c.year}</td><td>{c.fuel}</td><td>₹{(c.price / 1e5).toFixed(2)}L</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
