import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, unitPrice } from './api';
import * as rt from './realtime';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const CART_KEY = 'omas_cart_v2'; // device-side cache of the *cart only*; the menu/orders/auth are never stored locally
const loadCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
const lineKey = (l) => [l.productId, l.size, [...(l.toppings || [])].sort().join('+'), l.cheese, l.instructions].join('|');

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(undefined); // undefined = still checking session
  const [cart, setCart] = useState(loadCart);
  const [live, setLive] = useState('connecting');
  const [couponVersion, setCouponVersion] = useState(0);
  const [toast, setToast] = useState(null);
  const cartReady = useRef(false);

  const notify = useCallback((message, type = 'ok') => {
    setToast({ message, type, id: Date.now() });
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);

  // ---------- data loading (authoritative, from the API)
  const loadAll = useCallback(async (initial = false) => {
    try {
      const [s, c, i] = await Promise.all([api('/settings'), api('/categories'), api('/items')]);
      setSettings(s.settings); setCategories(c.categories); setItems(i.items); setError('');
    } catch (e) { if (initial) setError(e.message); }
    finally { if (initial) setLoading(false); }
  }, []);
  const refreshMe = useCallback(async () => {
    try { const r = await api('/auth/me'); setUser(r.user); return r.user; } catch { setUser(null); return null; }
  }, []);

  useEffect(() => {
    loadAll(true); refreshMe(); rt.connect();
    const offs = [
      rt.onStatus(setLive),
      rt.onResync(() => { loadAll(); }),                                  // re-fetch after reconnect
      rt.on('menu:updated', ({ action, item, id }) => setItems(prev => {  // payload only sent after the DB write succeeded
        if (action === 'deleted') return prev.filter(p => p.id !== id);
        if (!item) return prev;
        const exists = prev.some(p => p.id === item.id);
        return exists ? prev.map(p => (p.id === item.id ? item : p)) : [item, ...prev];
      })),
      rt.on('menu:refresh', () => loadAll()),
      rt.on('categories:updated', () => loadAll()),
      rt.on('settings:updated', ({ settings: s }) => s && setSettings(s)),
      rt.on('coupons:updated', () => setCouponVersion(v => v + 1))
    ];
    return () => offs.forEach(f => f());
  }, [loadAll, refreshMe]);

  // ---------- cart
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* storage full */ } }, [cart]);

  // logged-in carts follow the customer across devices
  const lastUser = useRef(null);
  useEffect(() => {
    if (user === undefined) return;
    const id = user ? user.id : null;
    if (id === lastUser.current) return;
    lastUser.current = id;
    rt.restart(); // server re-evaluates event channels for the new session
    if (!user) { cartReady.current = false; return; }
    api('/auth/me/cart').then(r => {
      setCart(local => {
        const merged = [...(r.cart || [])];
        for (const l of local) { if (!merged.some(m => lineKey(m) === lineKey(l))) merged.push(l); }
        return merged;
      });
    }).catch(() => {}).finally(() => { cartReady.current = true; });
  }, [user]);
  useEffect(() => {
    if (!user || !cartReady.current) return;
    const t = setTimeout(() => {
      api('/auth/me/cart', { method: 'PUT', body: { cart: cart.map(l => ({ productId: l.productId, quantity: l.quantity, size: l.size, toppings: l.toppings, cheese: l.cheese, instructions: l.instructions })) } }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [cart, user]);

  const byId = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

  // Cart lines re-priced from the live menu, so admin price changes show up in carts immediately.
  const cartLines = useMemo(() => cart.map(l => {
    const p = byId.get(l.productId);
    if (!p) return { ...l, key: lineKey(l), missing: !loading, name: l.name || 'Item', unitPrice: 0, available: false };
    const { unit, size } = unitPrice(p, l);
    return { ...l, key: lineKey(l), name: p.name, image: p.image, size, unitPrice: unit, available: p.available, product: p };
  }), [cart, byId, loading]);
  const cartCount = cartLines.reduce((s, l) => s + l.quantity, 0);
  const cartSubtotal = cartLines.reduce((s, l) => s + (l.available ? l.unitPrice * l.quantity : 0), 0);

  const addToCart = useCallback((product, opts = {}) => {
    const line = { productId: product.id, quantity: opts.quantity || 1, size: opts.size || '', toppings: opts.toppings || [], cheese: opts.cheese || '', instructions: opts.instructions || '' };
    if (product.sizes?.length && !line.size) line.size = product.sizes[0].name;
    setCart(prev => {
      const k = lineKey(line);
      const found = prev.find(l => lineKey(l) === k);
      return found ? prev.map(l => (lineKey(l) === k ? { ...l, quantity: Math.min(l.quantity + line.quantity, 50) } : l)) : [...prev, line];
    });
    notify(`${product.name} added to cart`);
  }, [notify]);
  const setQty = useCallback((key, qty) => setCart(prev => (qty <= 0 ? prev.filter(l => lineKey(l) !== key) : prev.map(l => (lineKey(l) === key ? { ...l, quantity: Math.min(qty, 50) } : l)))), []);
  const removeLine = useCallback((key) => setCart(prev => prev.filter(l => lineKey(l) !== key)), []);
  const clearCart = useCallback(() => setCart([]), []);

  // ---------- auth
  const login = async (email, password) => { const r = await api('/auth/login', { method: 'POST', body: { email, password } }); setUser(r.user); return r.user; };
  const register = async (body) => { const r = await api('/auth/register', { method: 'POST', body }); setUser(r.user); return r.user; };
  const logout = async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); notify('Logged out'); };
  const isStaff = !!user && ['superadmin', 'manager', 'cashier', 'kitchen'].includes(user.role);

  const value = { settings, categories, items, byId, loading, error, reload: () => loadAll(true), user, setUser, refreshMe, login, register, logout, isStaff, live, couponVersion,
    cart: cartLines, cartCount, cartSubtotal, addToCart, setQty, removeLine, clearCart, notify, toast };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

