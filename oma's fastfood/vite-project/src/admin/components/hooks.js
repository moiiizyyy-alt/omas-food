import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useApp } from '../../lib/store.jsx';
import * as rt from '../../lib/realtime';

// { user, can(perm), toast(msg, type) } provided by AdminApp
export const AdminCtx = createContext(null);
export const useAdmin = () => useContext(AdminCtx);

// Fetch a path. `loading` is derived (no setState in effects); refresh() refetches silently, reload() shows the skeleton.
export function useLoad(path) {
  const { setUser } = useApp();
  const [n, setN] = useState(0);
  const [m, setM] = useState(0);
  const [res, setRes] = useState({ key: null, data: null, error: '' });
  const key = path ? `${path}#${n}` : null;
  useEffect(() => {
    if (!path) return undefined;
    let off = false;
    api(path)
      .then((data) => { if (!off) setRes({ key: `${path}#${n}`, data, error: '' }); })
      .catch((e) => {
        if (off) return;
        if (e.status === 401) setUser(null);
        setRes((s) => ({ key: `${path}#${n}`, data: s.data, error: e.message }));
      });
    return () => { off = true; };
  }, [path, n, m, setUser]);
  const reload = useCallback(() => setN((x) => x + 1), []);
  const refresh = useCallback(() => setM((x) => x + 1), []);
  return { data: res.data, error: res.error, loading: !!key && res.key !== key, reload, refresh };
}

// Mutation wrapper: toasts the error (or success message). Resolves to a truthy object, or null on failure.
export function useAct() {
  const { toast } = useAdmin();
  const { setUser } = useApp();
  return useCallback(async (fn, okMsg) => {
    try {
      const r = await fn();
      if (okMsg) toast(okMsg);
      return r || {};
    } catch (e) {
      if (e.status === 401) setUser(null);
      toast(e.message || 'Something went wrong', 'err');
      return null;
    }
  }, [toast, setUser]);
}

// Subscribe to realtime events (and reconnect resyncs). Cleans up on unmount.
export function useLive(events, cb) {
  const ref = useRef(cb);
  useEffect(() => { ref.current = cb; });
  const key = events.join(',');
  useEffect(() => {
    const offs = key.split(',').filter(Boolean).map((e) => rt.on(e, (d) => ref.current(d || {})));
    offs.push(rt.onResync(() => ref.current({ resync: true })));
    return () => offs.forEach((f) => f());
  }, [key]);
}

// Debounced value
export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
