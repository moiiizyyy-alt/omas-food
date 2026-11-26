import { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { useSeo } from '../lib/seo.js';
import { Hours } from '../components/Footer.jsx';
import { Icon } from '../components/Navbar.jsx';

export default function Contact() {
  const { settings: s, user, notify } = useApp();
  useSeo({ title: 'Contact us', description: "Get in touch with Oma's Pizza — address, WhatsApp, opening hours and message form." });
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', message: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.value }));
  const wa = s?.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\D/g, '')}` : '';

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try {
      const r = await api('/contact', { method: 'POST', body: f });
      setOk(r.message); setF(v => ({ ...v, message: '' })); notify('Message sent!');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="container page">
      <h1>Contact us</h1>
      <p className="lead" style={{ marginBottom: 24 }}>Questions, catering or feedback? We read every message.</p>
      <div className="checkout-grid">
        <form className="card" style={{ padding: 24 }} onSubmit={submit}>
          <h2>Send a message</h2>
          {err && <div className="form-error" role="alert">{err}</div>}
          {ok && <div className="form-ok" role="status">{ok}</div>}
          <div className="field"><label htmlFor="c-name">Your name</label><input id="c-name" className="input" required value={f.name} onChange={set('name')} /></div>
          <div className="row row-2">
            <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" className="input" value={f.email} onChange={set('email')} /></div>
            <div className="field"><label htmlFor="c-phone">Phone</label><input id="c-phone" type="tel" className="input" value={f.phone} onChange={set('phone')} /></div>
          </div>
          <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" className="textarea" required value={f.message} onChange={set('message')} /></div>
          <button className="btn btn-lg" disabled={busy}>{busy ? 'Sending...' : 'Send message'}</button>
        </form>

        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card info-card">
            <h3>Find us</h3>
            {s?.address && <p className="addr"><Icon name="pin" size={16} /> {s.address}</p>}
            {s?.phone && <p className="addr"><Icon name="phone" size={16} /> <a href={`tel:${s.phone}`}>{s.phone}</a></p>}
            {s?.email && <p className="addr"><a href={`mailto:${s.email}`}>{s.email}</a></p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {wa && <a className="btn btn-sm" href={wa} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>}
              {s?.social?.instagram && <a className="btn btn-sm btn-ghost" href={s.social.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
              {s?.social?.facebook && <a className="btn btn-sm btn-ghost" href={s.social.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>}
            </div>
          </div>
          <div className="card info-card"><h3><Icon name="clock" size={18} /> Opening hours</h3><Hours hours={s?.openingHours} /></div>
          {s?.mapEmbedUrl && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <iframe title="Restaurant location map" src={s.mapEmbedUrl} width="100%" height="260" style={{ border: 0, display: 'block' }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

