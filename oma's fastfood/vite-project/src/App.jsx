import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useApp } from './lib/store.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import ProductModal from './components/ProductModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import Home from './pages/Home.jsx';
import Menu from './pages/Menu.jsx';
import About from './pages/About.jsx';
import Gallery from './pages/Gallery.jsx';
import Checkout from './pages/Checkout.jsx';
import Track from './pages/Track.jsx';
import Account from './pages/Account.jsx';

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function NotFound() {
  return <div className="container empty" style={{ padding: '96px 0' }}><h1>Page not found</h1><p>The page you are looking for does not exist.</p><a className="btn" href="/">Back to home</a></div>;
}

function Shell() {
  const { toast } = useApp();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Navbar />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/about" element={<About />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/track" element={<Track />} />
          <Route path="/track/:num" element={<Track />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer /><ProductModal /><AuthModal />
      {toast && <div className={`toast ${toast.type === 'err' ? 'err' : ''}`} role="status" aria-live="polite">{toast.message}</div>}
    </>
  );
}

export default function App() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) {
    return <Suspense fallback={<div className="container empty"><div className="spinner" /></div>}><AdminApp /></Suspense>;
  }
  return <Shell />;
}
