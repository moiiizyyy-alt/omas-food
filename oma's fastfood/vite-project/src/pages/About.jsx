import { Link } from 'react-router-dom';
import { useApp } from '../lib/store.jsx';
import { useSeo } from '../lib/seo.js';
import { Thumb } from '../components/FoodCard.jsx';
import { assetUrl } from '../lib/api.js';

const STORY_SECTIONS = [
  {
    eyebrow: 'Chapter 01 · Origins',
    title: 'Born in a Warm Home Kitchen',
    body: [
      "Oma's Pizza began inside a lively family home kitchen with a weathered recipe notebook, a hot stone deck, and a stubborn belief that great food never cuts corners.",
      'What started as Sunday family dinners quickly turned into neighbors knocking on the door for one more slice. Even as our kitchen has grown, every order is still treated with that exact same home-cooked care.'
    ],
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=900&auto=format&fit=crop&q=80',
    alt: 'Warm home kitchen preparing fresh ingredients'
  },
  {
    eyebrow: 'Chapter 02 · The Craft',
    title: 'Hand-Stretched Dough & Stone-Oven Fire',
    body: [
      'Every morning before sunrise, our bakers mix high-protein flour, filtered water, sea salt, and a pinch of olive oil — letting our dough slow-ferment so the crust bakes light, airy, and blistered with crisp golden edges.',
      'Each pizza is hand-stretched to order and slid straight onto scorching hot stone, sealing in smoky aroma and bubbling mozzarella in just minutes.'
    ],
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&auto=format&fit=crop&q=80',
    alt: 'Freshly baked artisan stone-oven pizza'
  },
  {
    eyebrow: 'Chapter 03 · Ingredients',
    title: 'Fresh Market Produce, Zero Shortcuts',
    body: [
      'We inspect every crate of vine-ripened tomatoes, crisp bell peppers, mushrooms, and aromatic basil that comes through our kitchen door each morning.',
      'Our signature tomato sauce is simmered slowly in-house with roasted garlic and Mediterranean herbs, paired only with 100% real pulled mozzarella and freshly marinated meats.'
    ],
    image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=900&auto=format&fit=crop&q=80',
    alt: 'Colorful fresh vegetables, herbs and kitchen ingredients'
  },
  {
    eyebrow: 'Chapter 04 · Beyond Pizza',
    title: 'Smashed Burgers, Creamy Pastas & Charcoal Grill',
    body: [
      'Over the years our menu expanded beyond pizza to celebrate every craving around the dinner table — double-seared smash burgers on toasted brioche, silky fettuccine Alfredo, sizzling karahi, and indulgent warm lava cakes.',
      'Whether you are ordering solo at midnight or hosting a full family feast, there is something unforgettable hot off the grill for everyone.'
    ],
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&auto=format&fit=crop&q=80',
    alt: 'Gourmet smashed burger served fresh from the grill'
  },
  {
    eyebrow: 'Chapter 05 · Our Promise',
    title: 'From Our Family Table Straight to Yours',
    body: [
      'Great hospitality does not stop when the pizza box closes. We pack every meal thoughtfully so crusts stay crisp, fries stay crunchy, and sauces arrive sealed and piping hot.',
      "When you open a box from Oma's Pizza, we want it to feel just like pulling up a chair at Oma's Sunday table — generous, comforting, and made to be shared."
    ],
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&auto=format&fit=crop&q=80',
    alt: 'Warm restaurant dining and sharing food with family'
  }
];

const VALUES = [
  ['Food Quality First', 'We taste every batch. If it is not good enough for our own family table, it never leaves the kitchen.'],
  ['Honest Freshness', 'Hand-made dough daily, real mozzarella, fresh herbs, and zero frozen shortcuts.'],
  ['Generous Portions', 'Loaded toppings, hearty combos, and warm service that keeps families coming back.']
];

export default function About() {
  const { settings: s } = useApp();
  useSeo({ title: 'About us', description: "The home-kitchen story, craft, and fresh ingredients behind Oma's Pizza." });
  const team = s?.team || [];

  return (
    <div className="container page">
      <div className="about-hero anim-rise">
        <span className="badge badge-red" style={{ marginBottom: 10 }}>Our Story</span>
        <h1>Made the way Oma taught us</h1>
        <p className="lead" style={{ maxWidth: 680 }}>
          {s?.about || "From a warm home kitchen to your favorite neighborhood stone-oven pizzeria — discover the craft, fresh ingredients, and family passion behind every bite at Oma's Pizza."}
        </p>
      </div>

      <div className="zigzag-list">
        {STORY_SECTIONS.map((sec, idx) => (
          <section className={`zigzag ${idx % 2 === 1 ? 'flip' : ''}`} key={sec.title}>
            <div className="zigzag-text">
              <span className="eyebrow" style={{ color: 'var(--tomato)' }}>{sec.eyebrow}</span>
              <h2>{sec.title}</h2>
              {sec.body.map((para, i) => <p key={i} className="lead">{para}</p>)}
            </div>
            <div className="zigzag-img">
              <Thumb src={sec.image} alt={sec.alt} ratio="4 / 3" />
            </div>
          </section>
        ))}
      </div>

      <div className="why-grid three" style={{ marginTop: 48 }}>
        {VALUES.map(([t, d], i) => (
          <div className="why-card" key={t}>
            <span className="why-n">0{i + 1}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </div>

      {team.length > 0 && (
        <>
          <h2 style={{ marginTop: 56 }}>Meet the team</h2>
          <div className="team">
            {team.map((m, i) => (
              <div className="member" key={i}>
                {m.image ? <img src={assetUrl(m.image)} alt={m.name} loading="lazy" /> : <span className="avatar">{m.name?.[0]}</span>}
                <b>{m.name}</b>
                <small>{m.role}</small>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card about-cta">
        <div>
          <h2>Hungry already?</h2>
          <p className="hint" style={{ margin: 0 }}>Explore our full menu of stone-baked pizzas, smash burgers, pasta and family deals.</p>
        </div>
        <Link className="btn btn-lg" to="/menu">Explore the Menu</Link>
      </div>
    </div>
  );
}
