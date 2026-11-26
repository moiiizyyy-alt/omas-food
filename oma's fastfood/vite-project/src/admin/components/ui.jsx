import { useEffect, useId, useRef, useState } from 'react';
import { api, assetUrl, money } from '../../lib/api';
import { useAct } from './hooks';
import { STATUS_CLASS } from './utils';

export function Modal({ title, onClose, wide, children, footer }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  const id = useId();
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); } };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, []);
  return (
    <div className="overlay adm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal adm-modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={ref}>
        <div className="modal-head"><h2 id={id}>{title}</h2><button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>✕</button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="adm-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel} footer={<>
      <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      <button type="button" className={`btn${danger ? ' btn-danger' : ''}`} disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : confirmLabel}</button>
    </>}>
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}

export function StatCard({ label, value, sub, tone }) {
  return (
    <div className={`adm-stat card${tone ? ` adm-stat-${tone}` : ''}`}>
      <div className="adm-stat-label">{label}</div>
      <div className="adm-stat-value">{value}</div>
      {sub != null && <div className="adm-stat-sub">{sub}</div>}
    </div>
  );
}

export const StatusBadge = ({ status }) => <span className={`badge ${STATUS_CLASS[status] || ''}`}>{status}</span>;

export function Loading({ rows = 5 }) {
  return (
    <div className="adm-loading" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton adm-sk" />)}
    </div>
  );
}
export const ErrorBox = ({ message, onRetry }) => (
  <div className="form-error adm-error" role="alert">{message}{onRetry && <button type="button" className="btn btn-sm btn-ghost" onClick={onRetry}>Retry</button>}</div>
);
export const Empty = ({ children = 'Nothing here yet.' }) => <div className="empty card adm-empty">{children}</div>;

export function PageHead({ title, sub, children }) {
  return (
    <div className="adm-page-head">
      <div><h1>{title}</h1>{sub && <p className="adm-muted">{sub}</p>}</div>
      {children && <div className="adm-head-actions">{children}</div>}
    </div>
  );
}

// Standard data-state wrapper: loading skeleton / error / children
export function State({ loading, error, onRetry, hasData = true, rows, children }) {
  if (loading && !hasData) return <Loading rows={rows} />;
  if (error && !hasData) return <ErrorBox message={error} onRetry={onRetry} />;
  return <>{error && <ErrorBox message={error} onRetry={onRetry} />}{children}</>;
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled} className={`adm-switch${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}><span /></button>
  );
}

export function CheckField({ label, checked, onChange }) {
  return (
    <label className="adm-check"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
  );
}

export function Field({ label, hint, children }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {typeof children === 'function' ? children(id) : children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function TextField({ label, value, onChange, hint, ...rest }) {
  return <Field label={label} hint={hint}>{(id) => <input id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />}</Field>;
}

export function Stars({ n }) {
  return <span aria-label={`${n} out of 5`} className="adm-stars">{'★'.repeat(n)}<span>{'★'.repeat(5 - n)}</span></span>;
}

// Image: upload (multipart POST /uploads) with preview, or paste a URL.
export function ImageField({ label = 'Image', value, onChange }) {
  const act = useAct();
  const [busy, setBusy] = useState(false);
  const id = useId();
  const pick = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('image', file);
    const r = await act(() => api('/uploads', { method: 'POST', form: fd }), 'Image uploaded');
    setBusy(false);
    if (r && r.url) onChange(r.url);
  };
  return (
    <div className="field adm-img-field">
      <label htmlFor={id}>{label}</label>
      <div className="adm-img-row">
        <div className="adm-img-prev">{value ? <img src={assetUrl(value)} alt="" /> : <span>No image</span>}</div>
        <div className="adm-img-ctl">
          <label className="btn btn-ghost btn-sm adm-file">{busy ? 'Uploading…' : 'Upload image'}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pick} disabled={busy} className="sr-only" />
          </label>
          <input id={id} className="input" placeholder="…or paste an image URL" value={value || ''} onChange={(e) => onChange(e.target.value)} />
          {value && <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange('')}>Remove</button>}
        </div>
      </div>
    </div>
  );
}

// name + price rows (sizes / toppings / cheese)
export function OptionRows({ label, rows, onChange, priceLabel = 'Price', hint }) {
  const set = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <fieldset className="adm-opts">
      <legend>{label}</legend>
      {hint && <p className="hint">{hint}</p>}
      {rows.map((r, i) => (
        <div className="adm-opt-row" key={i}>
          <input className="input" aria-label={`${label} name ${i + 1}`} placeholder="Name" value={r.name} onChange={(e) => set(i, 'name', e.target.value)} />
          <input className="input" type="number" min="0" step="any" aria-label={`${label} ${priceLabel.toLowerCase()} ${i + 1}`} placeholder={priceLabel} value={r.price} onChange={(e) => set(i, 'price', e.target.value)} />
          <button type="button" className="icon-btn" aria-label={`Remove ${label} ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange([...rows, { name: '', price: '' }])}>+ Add</button>
    </fieldset>
  );
}

// Pill tabs
export function Tabs({ value, onChange, tabs }) {
  return (
    <div className="adm-tabs" role="tablist">
      {tabs.map(([k, label]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} className={`adm-tab${value === k ? ' active' : ''}`} onClick={() => onChange(k)}>{label}</button>
      ))}
    </div>
  );
}

export const MoneyCell = ({ v }) => <span className="adm-num">{money(v)}</span>;

// Re-export so sections import UI helpers from one place
export { money };
