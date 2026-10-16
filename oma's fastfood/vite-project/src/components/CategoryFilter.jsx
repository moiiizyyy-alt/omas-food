import React from 'react';
import { CATEGORIES } from '../data/defaultMenu';

export default function CategoryFilter({ selectedCategory, onSelectCategory, items }) {
  // Compute item count per category dynamically
  const getCategoryCount = (catId) => {
    if (catId === 'all') return items.length;
    return items.filter(item => item.category === catId).length;
  };

  return (
    <div className="categories-wrapper">
      <div className="container">
        <div className="categories-scroll">
          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.id);
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                className={`category-pill ${isActive ? 'active' : ''}`}
                onClick={() => onSelectCategory(cat.id)}
              >
                <span className="category-pill-icon">{cat.icon}</span>
                <span>{cat.name}</span>
                <span className="category-pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
