// One shared EventSource (Server-Sent Events) for the whole app.
// Reconnects automatically; triggers onResync ONLY after an actual disconnect/offline recovery.
import { eventsUrl } from './api';

const EVENTS = ['hello', 'menu:updated', 'menu:refresh', 'categories:updated', 'settings:updated', 'coupons:updated', 'reviews:updated',
  'order:new', 'order:status', 'reservation:updated', 'reservation:status', 'review:new', 'inventory:low', 'message:new'];

const listeners = new Map();
const resync = new Set();
const statusSubs = new Set();
let es = null, status = 'connecting', wasOffline = false, trackedOrders = [], trackedKey = '', poll = null, lastTick = Date.now();

const setStatus = (s) => { status = s; statusSubs.forEach(f => f(s)); };

function start() {
  stop();
  setStatus('connecting');
  es = new EventSource(eventsUrl(trackedOrders), { withCredentials: true });
  EVENTS.forEach(name => es.addEventListener(name, (e) => {
    let data = {}; try { data = JSON.parse(e.data); } catch { /* ignore */ }
    if (name === 'hello') return;
    (listeners.get(name) || []).forEach(fn => fn(data));
  }));
  es.addEventListener('hello', () => {
    const needResync = wasOffline;
    wasOffline = false;
    setStatus('live');
    if (needResync) resync.forEach(fn => fn());
  });
  es.onerror = () => { wasOffline = true; setStatus('offline'); };
}
function stop() { if (es) { es.close(); es = null; } }

export function connect() { if (!es) start(); }
export function restart() { start(); }
export function trackOrders(list) {
  const key = JSON.stringify(list || []);
  if (key === trackedKey) return; // avoid redundant reconnects / loops
  trackedKey = key;
  trackedOrders = list || [];
  if (es) start();
}

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}
export const onResync = (fn) => { resync.add(fn); return () => resync.delete(fn); };
export const onStatus = (fn) => { statusSubs.add(fn); fn(status); return () => statusSubs.delete(fn); };

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { wasOffline = true; start(); });
  window.addEventListener('offline', () => { wasOffline = true; setStatus('offline'); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (!es || es.readyState === 2)) { wasOffline = true; start(); }
  });
  poll = setInterval(() => { if (document.visibilityState === 'visible' && status !== 'live') resync.forEach(fn => fn()); lastTick = Date.now(); }, 30000);
}
export { poll, lastTick };
