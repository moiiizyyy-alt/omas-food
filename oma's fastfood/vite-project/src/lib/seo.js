import { useEffect } from 'react';

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

export function useSeo({ title, description, image }) {
  useEffect(() => {
    const full = title ? `${title} | Oma's Pizza` : "Oma's Pizza | Stone-baked pizza, burgers & more";
    document.title = full;
    if (description) { setMeta('name', 'description', description); setMeta('property', 'og:description', description); }
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:type', 'restaurant.restaurant');
    if (image) setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', window.location.href);
    setMeta('name', 'twitter:card', 'summary_large_image');
  }, [title, description, image]);
}

// stable pseudo-random choice so each card keeps its aspect ratio between renders
export function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

