// src/pages/HospitalPage.tsx
import { useState } from 'react';
import ChatPanel from '../components/ChatPanel';

export default function HospitalPage() {
  const [lang, setLang] = useState('en');
  return (
    <>
      <div className="top"><div><h1>🏥 Hospital Queue Agent</h1><div className="sub">Patient intake · token · surge alerts (EN/HI/JA)</div></div></div>
      <ChatPanel agent="🏥" endpoint="/api/hospital/intake" langState={[lang, setLang]}
        examples={['My name is Rajesh, fever since morning', 'मुझे पेट दर्द है', 'What is my queue position?']}
        placeholder="Patient message…" />
    </>
  );
}
