import { useEffect, useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { useSeo } from '../lib/seo.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Reserve() {
  const { user, notify } = useApp();
  useSeo({ title: 'Reserve a table', description: "Book a table at Oma's Pizza with live seat availability." });
  const [date, setDate] = useState(todayStr);
  const [slots, setSlots] = useState([]);
  const [closed, setClosed] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [f, setF] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '', specialRequests: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(null);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true); setTime(''); setErr('');
    api(`/reservations/availability?date=${encodeURIComponent(date)}`)
      .then(r => { setClosed(!!r.closed); setSlots(r.slots || []); })
      .catch(e => setErr(e.message))
      .finally(() => setLoadingSlots(false));
  }, [date]);

  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!time) { setErr('Please pick an available time slot.'); return; }
    setBusy(true);
    try {
      const r = await api('/reservations', { method: 'POST', body: { ...f, date, time, guests: Number(guests) } });
      setDone(r.reservation); notify('Table reserved!');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="container page" style={{ maxWidth: 600 }}>
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <span className="badge badge-green">Reservation received</span>
          <h1 style={{ marginTop: 12 }}>See you soon, {done.name}!</h1>
          <p className="lead">Reference: <b>{done.reference}</b></p>
          <p>{done.date} at <b>{done.time}</b> for <b>{done.guests}</b> {done.guests === 1 ? 'guest' : 'guests'}.</p>
          <button className="btn" onClick={() => setDone(null)}>Book another table</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: 720 }}>
      <h1>Reserve a table</h1>
      <p className="lead" style={{ marginBottom: 24 }}>Real-time seat availability based on our dining room capacity.</p>
      <form className="card" style={{ padding: 24 }} onSubmit={submit}>
        {err && <div className="form-error" role="alert">{err}</div>}
        <div className="row row-2">
          <div className="field"><label htmlFor="r-date">Date</label><input id="r-date" type="date" min={todayStr()} className="input" required value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="field"><label htmlFor="r-guests">Guests</label><input id="r-guests" type="number" min={1} max={50} className="input" required value={guests} onChange={e => setGuests(e.target.value)} /></div>
        </div>
        <div className="field">
          <label>Available times</label>
          {loadingSlots ? <div className="spinner" /> : closed ? <p className="hint">We are closed on this day.</p> : slots.length === 0 ? <p className="hint">No remaining slots for this date. Try another day.</p> : (
            <div className="slots">
              {slots.map(s => (
                <button type="button" key={s.time} className={`slot ${time === s.time ? 'on' : ''}`} disabled={s.seatsLeft < Number(guests)} onClick={() => setTime(s.time)}>
                  {s.time} <small>({s.seatsLeft} left)</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="row row-2">
          <div className="field"><label htmlFor="r-name">Full name</label><input id="r-name" className="input" required value={f.name} onChange={set('name')} /></div>
          <div className="field"><label htmlFor="r-phone">Phone</label><input id="r-phone" type="tel" className="input" required value={f.phone} onChange={set('phone')} /></div>
        </div>
        <div className="field"><label htmlFor="r-email">Email (optional)</label><input id="r-email" type="email" className="input" value={f.email} onChange={set('email')} /></div>
        <div className="field"><label htmlFor="r-req">Special requests</label><textarea id="r-req" className="textarea" placeholder="Birthday, high chair, window seat..." value={f.specialRequests} onChange={set('specialRequests')} /></div>
        <button className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Booking...' : 'Confirm reservation'}</button>
      </form>
    </div>
  );
}

