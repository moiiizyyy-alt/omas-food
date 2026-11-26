import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const UI = createContext(null);
export const useUI = () => useContext(UI);

export function UIProvider({ children }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [auth, setAuth] = useState(null);          // null | 'login' | 'register' | 'forgot' | 'reset'
  const [resetToken, setResetToken] = useState('');
  const [productId, setProductId] = useState(null);
  const [coupon, setCoupon] = useState(null);      // { code, discount } - validated by the server, re-validated at checkout

  // password-reset links look like /?reset=TOKEN
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('reset');
    if (t) { setResetToken(t); setAuth('reset'); }
  }, []);

  const openAuth = useCallback((mode = 'login') => setAuth(mode), []);
  const value = useMemo(() => ({
    cartOpen, openCart: () => setCartOpen(true), closeCart: () => setCartOpen(false),
    auth, openAuth, closeAuth: () => setAuth(null), resetToken,
    productId, openProduct: setProductId, closeProduct: () => setProductId(null), coupon, setCoupon
  }), [cartOpen, auth, openAuth, resetToken, productId, coupon]);
  return <UI.Provider value={value}>{children}</UI.Provider>;
}
