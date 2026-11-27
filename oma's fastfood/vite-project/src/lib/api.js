// API client. All data comes from the backend (MongoDB Atlas). The auth session lives in an
// HTTP-only cookie set by the server; nothing sensitive is kept in localStorage.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, body) { super(message); this.status = status; this.body = body; }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: form || (body ? JSON.stringify(body) : undefined),
      cache: 'no-store'
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your internet connection.', 0);
  }
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) throw new ApiError((data && data.message) || `Request failed (${res.status})`, res.status, data);
  if (!data || typeof data !== 'object') throw new ApiError('Server returned an unexpected response.', res.status);
  return data;
}

export const eventsUrl = (orders = []) => {
  const q = orders.length ? `?orders=${encodeURIComponent(orders.map(o => `${o.orderNumber}:${o.token}`).join(','))}` : '';
  return `${BASE}/api/events${q}`;
};
export const assetUrl = (u) => (u && u.startsWith('/api/') ? `${BASE}${u}` : u);
export const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;

// Same formula as the backend (display only; the server always re-prices orders).
export function unitPrice(p, { size, toppings = [], cheese } = {}) {
  const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const ratio = p.discountPrice != null && p.price > 0 ? p.discountPrice / p.price : 1;
  let base = p.discountPrice != null ? p.discountPrice : p.price;
  let sizeName = '';
  if (p.sizes && p.sizes.length) {
    const s = p.sizes.find(x => x.name === size) || p.sizes[0];
    sizeName = s.name; base = round(s.price * ratio);
  }
  let extra = 0;
  for (const t of toppings) { const f = (p.toppings || []).find(x => x.name === t); if (f) extra += f.price; }
  if (cheese) { const c = (p.cheeseOptions || []).find(x => x.name === cheese); if (c) extra += c.price; }
  return { unit: round(base + extra), size: sizeName };
}

