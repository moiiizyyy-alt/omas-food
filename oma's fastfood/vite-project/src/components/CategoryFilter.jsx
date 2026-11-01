import React from 'react';
import { CATEGORIES } from '../data/defaultMenu';

export default function CategoryFilter({ selectedCategory, onSelectCategory, items }) {
  // Compute item count per category dynamically with trim and case-insensitive check
  const getCategoryCount = (catId) => {
    if (catId === 'all') return items.length;
    const target = catId.trim().toLowerCase();
    return items.filter(item => 
      item.category && item.category.trim().toLowerCase() === target
    ).length;
  };

  const handleCategoryClick = (catId) => {
    onSelectCategory(catId);
    
    // Smooth scroll straight to the food menu section so results are immediately visible
    setTimeout(() => {
      const menuEl = document.getElementById('menu-section');
      if (menuEl) {
        menuEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <div className="categories-wrapper">
      <div className="container">
        <div className="categories-scroll">
          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.id);
            const isActive =
              (selectedCategory === 'all' && cat.id === 'all') ||
              (selectedCategory && cat.id !== 'all' && selectedCategory.trim().toLowerCase() === cat.id.trim().toLowerCase());

            return (
              <button
                key={cat.id}
                type="button"
                className={`category-pill ${isActive ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
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
