import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/store.jsx';
import { useUI } from '../lib/ui.jsx';
import { assetUrl } from '../lib/api.js';

export const Icon = ({ name, size = 22 }) => {
  const p = {
    home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    menu: 'M4 7h16M4 12h16M4 17h16',
    bag: 'M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    gallery: 'M4 5h16v14H4zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM20 15l-5-5-8 8',
    shield: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z',
    track: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
    x: 'M6 6l12 12M18 6L6 18',
    plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
    pizza: 'M12 3C7 3 3 6 2 10l10 12 10-12c-1-4-5-7-10-7zM9 10h.01M14 9h.01M12 14h.01',
    pin: 'M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
    star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
    chev: 'M9 6l6 6-6 6', check: 'M5 12l5 5 9-10', flame: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-5 1-8z'
  }[name];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={p} /></svg>;
};

export function Logo({ settings }) {
  return (
    <Link to="/" className="logo" aria-label={`${settings?.restaurantName || "Oma's Pizza"} home`}>
      {settings?.logo ? <img src={assetUrl(settings.logo)} alt="" className="logo-img" /> : <span className="logo-mark"><Icon name="pizza" size={20} /></span>}
      <span className="logo-text">{settings?.restaurantName || "Oma's Pizza"}</span>
    </Link>
  );
}

export default function Navbar() {
  const { settings, cartCount } = useApp();
  const { openCart } = useUI();
  const [more, setMore] = useState(false);
  const nav = useNavigate();
  const links = [['/', 'Home'], ['/menu', 'Menu'], ['/about', 'About'], ['/gallery', 'Gallery']];
  const close = () => setMore(false);

  return (
    <>
      <header className="nav">
        <div className="container nav-in">
          <button className="icon-btn nav-burger" aria-label="Open menu" aria-expanded={more} onClick={() => setMore(v => !v)}><Icon name={more ? 'x' : 'menu'} /></button>
          <Logo settings={settings} />
          <nav className="nav-links" aria-label="Main">
            {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>)}
          </nav>
          <div className="nav-actions">
            <button className="icon-btn" aria-label="Search the menu" onClick={() => nav('/menu?focus=search')}><Icon name="search" /></button>
            <Link className="btn btn-sm btn-ghost nav-login" to="/track"><Icon name="track" size={16} /> Track Order</Link>
            <Link className="btn btn-sm btn-ghost nav-login" to="/admin">Admin Panel</Link>
            <Link className="icon-btn nav-userico" aria-label="Admin Panel" to="/admin"><Icon name="shield" size={20} /></Link>
            <button className="btn btn-sm cart-btn" onClick={openCart} aria-label={`Open cart, ${cartCount} items`}>
              <Icon name="bag" size={18} /><span className="cart-label">Cart</span>{cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </button>
          </div>
        </div>
        {more && (
          <div className="mobile-sheet" onClick={close}>
            <nav className="container" aria-label="Mobile" onClick={e => e.stopPropagation()}>
              {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={close}>{label}</NavLink>)}
              <NavLink to="/track" onClick={close}>Track Order Status</NavLink>
              <NavLink to="/admin" onClick={close}>Admin Panel</NavLink>
            </nav>
          </div>
        )}
      </header>

      <nav className="tabbar" aria-label="Quick navigation">
        <NavLink to="/" end><Icon name="home" /><span>Home</span></NavLink>
        <NavLink to="/menu"><Icon name="pizza" /><span>Menu</span></NavLink>
        <button onClick={openCart} aria-label={`Cart, ${cartCount} items`} className="tab-cart"><span className="tab-cart-ico"><Icon name="bag" />{cartCount > 0 && <b>{cartCount}</b>}</span><span>Cart</span></button>
        <NavLink to="/track"><Icon name="track" /><span>Track</span></NavLink>
        <NavLink to="/admin"><Icon name="shield" /><span>Admin</span></NavLink>
      </nav>
    </>
  );
}
