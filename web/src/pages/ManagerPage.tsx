// src/pages/ManagerPage.tsx
import { useState } from 'react';
import ChatPanel from '../components/ChatPanel';

export default function ManagerPage() {
  const [lang, setLang] = useState('en');
  return (
    <>
      <div className="top"><div><h1>🎯 Manager (Call Agent)</h1><div className="sub">Routes any request to the right specialist agent</div></div></div>
      <ChatPanel agent="🎯" endpoint="/api/manager/route" langState={[lang, setLang]}
        examples={['patient wants appointment', 'book a hotel room', 'on-road price of a car', 'reschedule my dental visit']}
        placeholder="Describe a request to route…" />
    </>
  );
}
