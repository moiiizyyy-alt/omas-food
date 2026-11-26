import { useState } from 'react';
import { api } from '../../lib/api';
import { useAct, useLoad } from '../components/hooks';
import { ConfirmDialog, Field, Modal, PageHead, State, TextField, Toggle } from '../components/ui';
import { fmtDate } from '../components/utils';

const ROLES = ['superadmin', 'manager', 'cashier', 'kitchen'];

export default function Staff() {
  const { data, loading, error, reload, refresh } = useLoad('/staff');
  const act = useAct();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const list = data?.staff || [];

  const save = async (e) => {
    e.preventDefault();
    const r = await act(() => api(edit.id ? `/staff/${edit.id}` : '/staff', { method: edit.id ? 'PUT' : 'POST', body: edit }), 'Staff member saved');
    if (r) { setEdit(null); refresh(); }
  };
  const toggle = async (u, active) => { if (await act(() => api(`/staff/${u.id}`, { method: 'PUT', body: { active } }), `${u.name} ${active ? 'activated' : 'deactivated'}`)) refresh(); };
  const remove = async () => { if (await act(() => api(`/staff/${del.id}`, { method: 'DELETE' }), 'Staff removed')) { setDel(null); refresh(); } };

  return (
    <>
      <PageHead title="Staff Management" sub="Role-based permissions enforced on the backend">
        <button className="btn" onClick={() => setEdit({ name: '', email: '', phone: '', role: 'cashier', password: '' })}>+ Add Staff</button>
      </PageHead>
      <State loading={loading} error={error} onRetry={reload} hasData={!!data}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Role</th><th>Active</th><th>Last Login</th><th></th></tr></thead>
            <tbody>
              {list.map(u => (
                <tr key={u.id}>
                  <td><b>{u.name}</b><div className="adm-muted">{u.email}</div></td>
                  <td><span className="badge badge-dark">{u.role}</span></td>
                  <td><Toggle checked={u.active} label={`Toggle ${u.name}`} onChange={v => toggle(u, v)} /></td>
                  <td className="adm-muted">{fmtDate(u.lastLoginAt)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEdit({ ...u, password: '' })}>Edit</button>{' '}
                    <button className="btn btn-sm btn-danger" onClick={() => setDel(u)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </State>
      {edit && (
        <Modal title={edit.id ? `Edit ${edit.name}` : 'Add Staff'} onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <TextField label="Full name" required value={edit.name} onChange={v => setEdit(x => ({ ...x, name: v }))} />
            {!edit.id && <TextField label="Email" type="email" required value={edit.email} onChange={v => setEdit(x => ({ ...x, email: v }))} />}
            <TextField label="Phone" value={edit.phone} onChange={v => setEdit(x => ({ ...x, phone: v }))} />
            <Field label="Role">{(id) => <select id={id} className="select" value={edit.role} onChange={e => setEdit(x => ({ ...x, role: e.target.value }))}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>}</Field>
            <TextField label={edit.id ? 'Reset password (leave blank to keep)' : 'Password (8+ chars, letter + number)'} type="password" required={!edit.id} value={edit.password} onChange={v => setEdit(x => ({ ...x, password: v }))} />
            <button className="btn btn-block">Save Staff</button>
          </form>
        </Modal>
      )}
      {del && <ConfirmDialog title="Delete staff account?" message={`Delete "${del.name}"?`} danger confirmLabel="Delete" onConfirm={remove} onCancel={() => setDel(null)} />}
    </>
  );
}

