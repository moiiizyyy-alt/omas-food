import { useEffect, useState } from 'react';

function getCols(w) {
  if (w >= 1020) return 4;
  if (w >= 640) return 3;
  return 2;
}

// True Pinterest-style multi-column flex masonry.
// Always 2 columns on mobile, 3 on tablet, 4 on desktop — zero CSS column-count clipping bugs
// and zero horizontal overflow on iOS Safari / Android Chrome.
export default function MasonryGrid({ items = [], renderItem, className = '' }) {
  const [cols, setCols] = useState(() => (typeof window !== 'undefined' ? getCols(window.innerWidth) : 2));

  useEffect(() => {
    const onResize = () => setCols(getCols(window.innerWidth));
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const buckets = Array.from({ length: cols }, () => []);
  items.forEach((item, idx) => {
    buckets[idx % cols].push({ item, idx });
  });

  return (
    <div className={`pmasonry ${className}`} style={{ '--cols': cols }}>
      {buckets.map((col, cIdx) => (
        <div className="pmasonry-col" key={cIdx}>
          {col.map(({ item, idx }) => (
            <div className="pmasonry-item" key={item.id || item.src || idx}>
              {renderItem(item, idx)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

