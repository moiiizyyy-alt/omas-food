import { Link } from 'react-router-dom';
import { useApp } from '../lib/store.jsx';
import { Icon, Logo } from './Navbar.jsx';

export function Hours({ hours }) {
  if (!hours || !hours.length) return <p className="hint">Opening hours coming soon.</p>;
  return (
    <ul className="hours">
      {hours.map(h => <li key={h.day}><span>{h.day}</span><b>{h.closed ? 'Closed' : `${h.open} - ${h.close}`}</b></li>)}
    </ul>
  );
}

export default function Footer() {
  const { settings: s } = useApp();
  const wa = s?.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\D/g, '')}` : '';
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Logo settings={s} />
          <p className="footer-tag">{s?.tagline || 'Stone-baked pizza, made with love'}</p>
          <div className="social">
            {s?.social?.instagram && <a href={s.social.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
            {s?.social?.facebook && <a href={s.social.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>}
            {s?.social?.tiktok && <a href={s.social.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          </div>
        </div>
        <div>
          <h3>Explore</h3>
          <ul className="flist">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/menu">Menu</Link></li>
            <li><Link to="/about">About us</Link></li>
            <li><Link to="/gallery">Gallery</Link></li>
            <li><Link to="/track">Track my order</Link></li>
          </ul>
        </div>
        <div>
          <h3>Visit us</h3>
          <ul className="flist">
            <li><Icon name="pin" size={16} /> {s?.address || "Oma's Pizza Kitchen, Main Boulevard"}</li>
            <li><Icon name="phone" size={16} /> <a href={`tel:${s?.phone || '0319615319'}`}>{s?.phone || '+92 319-615319'}</a></li>
            <li><a href={`mailto:${s?.email || 'moiiizyyy@gmail.com'}`}>{s?.email || 'moiiizyyy@gmail.com'}</a></li>
          </ul>
        </div>
        <div><h3>Opening hours</h3><Hours hours={s?.openingHours} /></div>
      </div>

      <div className="container footer-bottom">
        <span>&copy; {new Date().getFullYear()} {s?.restaurantName || "Oma's Pizza"}. All rights reserved.</span>
        <div className="dev-watermark" aria-label="Developer signature">
          <svg className="dev-sig-svg" viewBox="0 0 180 46" fill="none" aria-hidden="true">
            <path
              d="M12 34 C16 14, 24 8, 26 28 C29 12, 39 10, 41 29 C46 18, 56 17, 56 26 C56 32, 48 33, 48 27 C48 21, 57 19, 64 25 C69 29, 71 21, 74 20 C73 27, 75 31, 80 28 C86 24, 92 20, 99 20 C93 26, 87 32, 99 31 C111 30, 128 24, 156 25"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="74.5" cy="13.5" r="1.4" fill="currentColor" />
          </svg>
          <span className="dev-sig-text">Developer : <b>Moiz</b> &nbsp;|&nbsp; Ph No. : <b>9231961-5319</b></span>
        </div>
        <Link to="/admin" className="staff-link">Admin Panel</Link>
      </div>
    </footer>
  );
}
