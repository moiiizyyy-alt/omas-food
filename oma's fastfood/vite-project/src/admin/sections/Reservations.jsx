import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useAct, useLive, useLoad } from '../components/hooks';
import { Empty, PageHead, State, StatusBadge } from '../components/ui';

export default function Reservations() {
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const path = useMemo(() => {
    const p = new URLSearchParams();
    if (date) p.set('date', date);
    if (status) p.set('status', status);
    return `/reservations${p.toString() ? `?${p}` : ''}`;
  }, [date, status]);
  const { data, loading, error, reload, refresh } = useLoad(path);
  useLive(['reservation:updated'], refresh);
  const act = useAct();
  const list = data?.reservations || [];

  const setSt = async (id, st) => { if (await act(() => api(`/reservations/${id}`, { method: 'PATCH', body: { status: st } }), `Reservation ${st}`)) refresh(); };
  const remove = async (id) => { if (await act(() => api(`/reservations/${id}`, { method: 'DELETE' }), 'Reservation removed')) refresh(); };

  return (
    <>
      <PageHead title="Reservations" sub="Table bookings with capacity protection" />
      <div className="adm-toolbar">
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        <select className="select" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}</select>
        {(date || status) && <button className="btn btn-sm btn-ghost" onClick={() => { setDate(''); setStatus(''); }}>Clear</button>}
      </div>
      <State loading={loading} error={error} onRetry={reload} hasData={!!data}>
        {list.length === 0 ? <Empty>No reservations found.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Ref</th><th>Date / Time</th><th>Guest</th><th>Party</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {list.map(r => (
                  <tr key={r._id}>
                    <td><b>{r.reference}</b></td>
                    <td>{r.date} · <b>{r.time}</b></td>
                    <td><b>{r.name}</b><div className="adm-muted">{r.phone}{r.specialRequests ? ` · ${r.specialRequests}` : ''}</div></td>
                    <td>{r.guests}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.status === 'Pending' && <button className="btn btn-sm" onClick={() => setSt(r._id, 'Confirmed')}>Confirm</button>}{' '}
                      {r.status === 'Confirmed' && <button className="btn btn-sm btn-ghost" onClick={() => setSt(r._id, 'Completed')}>Complete</button>}{' '}
                      {r.status !== 'Cancelled' && <button className="btn btn-sm btn-danger" onClick={() => setSt(r._id, 'Cancelled')}>Cancel</button>}{' '}
                      <button className="btn btn-sm btn-ghost" onClick={() => remove(r._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </State>
    </>
  );
}

