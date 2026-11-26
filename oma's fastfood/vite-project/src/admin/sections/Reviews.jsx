import { api } from '../../lib/api';
import { useAct, useLive, useLoad } from '../components/hooks';
import { Empty, PageHead, Stars, State, StatusBadge } from '../components/ui';
import { fmtDay } from '../components/utils';

export default function Reviews() {
  const { data, loading, error, reload, refresh } = useLoad('/reviews/all');
  useLive(['review:new'], refresh);
  const act = useAct();
  const list = data?.reviews || [];

  const moderate = async (id, status) => { if (await act(() => api(`/reviews/${id}`, { method: 'PATCH', body: { status } }), `Review ${status}`)) refresh(); };
  const remove = async (id) => { if (await act(() => api(`/reviews/${id}`, { method: 'DELETE' }), 'Review deleted')) refresh(); };

  return (
    <>
      <PageHead title="Reviews" sub="Moderate verified customer reviews" />
      <State loading={loading} error={error} onRetry={reload} hasData={!!data}>
        {list.length === 0 ? <Empty>No reviews yet.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Customer</th><th>Rating</th><th>Comment</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.id}>
                    <td><b>{r.name}</b></td>
                    <td><Stars n={r.rating} /></td>
                    <td>{r.comment || '-'}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="adm-muted">{fmtDay(r.createdAt)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.status !== 'approved' && <button className="btn btn-sm" onClick={() => moderate(r.id, 'approved')}>Approve</button>}{' '}
                      {r.status !== 'rejected' && <button className="btn btn-sm btn-ghost" onClick={() => moderate(r.id, 'rejected')}>Reject</button>}{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>Delete</button>
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

