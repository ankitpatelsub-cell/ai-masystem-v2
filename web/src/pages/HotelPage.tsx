// src/pages/HotelPage.tsx
import { useState } from 'react';
import ChatPanel from '../components/ChatPanel';

export default function HotelPage() {
  const [lang, setLang] = useState('en');
  return (
    <>
      <div className="top"><div><h1>🏨 Hotel Booking Agent</h1><div className="sub">Rooms · check-in queue · direct booking</div></div></div>
      <ChatPanel agent="🏨" endpoint="/api/hotel/intake" langState={[lang, setLang]}
        examples={['I want a deluxe room for 2 nights', 'कमरा बुक करना है', '空室はありますか']}
        placeholder="Guest message…" />
    </>
  );
}
