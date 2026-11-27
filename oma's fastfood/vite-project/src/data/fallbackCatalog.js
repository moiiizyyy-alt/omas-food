// Fallback catalog used ONLY when the backend API is unreachable (e.g., frontend-only static preview).
// When the backend is online, live MongoDB data always overrides this immediately.
const PIZZA_SIZES = [{ name: 'Small (9")', price: 850 }, { name: 'Medium (12")', price: 1350 }, { name: 'Large (15")', price: 1850 }];
const PIZZA_TOPPINGS = [{ name: 'Extra Pepperoni', price: 220 }, { name: 'Black Olives', price: 120 }, { name: 'Jalapeños', price: 110 }, { name: 'Mushrooms', price: 140 }];
const PIZZA_CHEESE = [{ name: 'Extra Mozzarella', price: 180 }, { name: 'Stuffed Cheese Crust', price: 290 }];

export const FALLBACK_CATEGORIES = [
  'Pizzas', 'Burgers', 'Pasta', 'Appetizers', 'Sandwiches', 'Drinks', 'Desserts', 'Deals & Combos'
].map((name, i) => ({ id: `cat-${i + 1}`, name, description: '', image: '', sortOrder: i, active: true }));

export const FALLBACK_SETTINGS = {
  restaurantName: "Oma's Pizza",
  tagline: 'Stone-baked pizza, made with love',
  logo: '',
  phone: '+92 319-615319',
  whatsapp: '92319615319',
  email: 'moiiizyyy@gmail.com',
  address: "Oma's Pizza Kitchen, Main Boulevard",
  deliveryFee: 100,
  freeDeliveryOver: 2500,
  minimumOrder: 0,
  taxRate: 0,
  openingHours: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({ day, open: '12:00', close: '23:30', closed: false })),
  promotions: [],
  banners: [],
  gallery: [],
  team: [],
  about: ''
};

const raw = [
  { id: 'fb-1', name: "Oma's Supreme Pizza", category: 'Pizzas', price: 1450, description: 'Signature loaded pizza with smoked chicken, pepperoni, mushrooms, black olives, bell peppers & pure mozzarella.', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=700&auto=format&fit=crop&q=80', badge: 'Best Seller', bestSeller: true, featured: true, diet: 'nonveg', spicy: 'Medium', sizes: PIZZA_SIZES, toppings: PIZZA_TOPPINGS, cheeseOptions: PIZZA_CHEESE, reviews: 180 },
  { id: 'fb-2', name: 'Classic Margherita Stone-Baked', category: 'Pizzas', price: 1150, description: 'San Marzano tomato sauce, hand-pulled fresh mozzarella, sweet basil leaves & olive oil on crisp dough.', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=700&auto=format&fit=crop&q=80', badge: 'Best Seller', bestSeller: true, featured: true, diet: 'veg', spicy: 'None', sizes: PIZZA_SIZES, toppings: PIZZA_TOPPINGS, cheeseOptions: PIZZA_CHEESE, reviews: 164 },
  { id: 'fb-3', name: 'Double Pepperoni Feast', category: 'Pizzas', price: 1490, discountPrice: 1340, description: 'Double layers of crispy charred pepperoni, bubbling golden mozzarella & signature pizza sauce.', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=700&auto=format&fit=crop&q=80', badge: 'Best Seller', bestSeller: true, featured: true, diet: 'nonveg', spicy: 'Mild', sizes: PIZZA_SIZES, toppings: PIZZA_TOPPINGS, cheeseOptions: PIZZA_CHEESE, reviews: 210 },
  { id: 'fb-4', name: 'Creamy Malai Boti Pizza', category: 'Pizzas', price: 1520, description: 'Velvety garlic cream base topped with charcoal-grilled chicken malai boti, red onions & mozzarella.', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&auto=format&fit=crop&q=80', badge: 'Chef Special', bestSeller: true, featured: true, diet: 'nonveg', spicy: 'Medium', sizes: PIZZA_SIZES, toppings: PIZZA_TOPPINGS, cheeseOptions: PIZZA_CHEESE, reviews: 142 },
  { id: 'fb-5', name: 'Crown Crust Chicken Fajita', category: 'Pizzas', price: 1650, discountPrice: 1490, description: 'Cheese-filled crown crust stuffed with smoky kabab pockets, fajita chicken, capsicum & olives.', image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=700&auto=format&fit=crop&q=80', badge: 'Best Seller', bestSeller: true, featured: true, diet: 'nonveg', spicy: 'Medium', sizes: PIZZA_SIZES, toppings: PIZZA_TOPPINGS, cheeseOptions: PIZZA_CHEESE, reviews: 185 },
  { id: 'fb-6', name: 'Peri Peri Fiery Chicken Pizza', category: 'Pizzas', price: 1480, description: 'Flame-grilled peri-peri chicken, roasted red bell peppers, jalapeños & smoky peri mayo drizzle.', image: 'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=700&auto=format&fit=crop&q=80', badge: 'Spicy Hit', bestSeller: false, featured: true, diet: 'nonveg', spicy: 'Hot', sizes: PIZZA_SIZES, toppings: PIZZA_TOPPINGS, cheeseOptions: PIZZA_CHEESE, reviews: 97 },
  { id: 'fb-7', name: 'Smoky Jalapeño Beef Burger', category: 'Burgers', price: 920, description: 'Smashed prime beef patty, aged cheddar, pickled jalapeños, crispy onion rings & chipotle glaze.', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=80', badge: 'Best Seller', bestSeller: true, featured: true, diet: 'nonveg', spicy: 'Hot', reviews: 152 },
  { id: 'fb-8', name: 'Nashville Hot Crispy Chicken', category: 'Burgers', price: 760, discountPrice: 690, description: 'Buttermilk-brined crunchy chicken glazed in fiery cayenne oil, pickles & cool slaw on brioche.', image: 'https://images.unsplash.com/photo-1615297928064-24977384d0da?w=700&auto=format&fit=crop&q=80', badge: 'Spicy Hit', bestSeller: true, featured: false, diet: 'nonveg', spicy: 'Hot', reviews: 119 },
  { id: 'fb-9', name: 'Truffle Mushroom Swiss Burger', category: 'Burgers', price: 980, description: 'Flame-grilled beef topped with sautéed garlic mushrooms, Swiss cheese & garlic aioli.', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=700&auto=format&fit=crop&q=80', badge: 'Chef Special', bestSeller: false, featured: true, diet: 'nonveg', spicy: 'None', reviews: 94 },
  { id: 'fb-10', name: 'Fettuccine Chicken Alfredo', category: 'Pasta', price: 1090, description: 'Silky parmesan garlic cream sauce tossed with fettuccine ribbons & char-grilled herb chicken.', image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=700&auto=format&fit=crop&q=80', badge: 'Best Seller', bestSeller: true, featured: true, diet: 'nonveg', spicy: 'None', reviews: 174 },
  { id: 'fb-11', name: 'Oven-Baked Lasagna Bolognese', category: 'Pasta', price: 1250, description: 'Layered pasta sheets with slow-simmered beef ragu, velvety béchamel & bubbling golden mozzarella.', image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=700&auto=format&fit=crop&q=80', badge: 'Chef Special', bestSeller: true, featured: true, diet: 'nonveg', spicy: 'Mild', reviews: 131 },
  { id: 'fb-12', name: 'Penne Arrabbiata Spicy Tomato', category: 'Pasta', price: 890, description: 'Penne tossed in fiery roasted garlic-chili San Marzano tomato sauce, black olives & basil.', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=700&auto=format&fit=crop&q=80', badge: 'Vegetarian', bestSeller: false, featured: false, diet: 'veg', spicy: 'Hot', reviews: 78 },
  { id: 'fb-13', name: 'Smoky Mac & Three Cheese Bake', category: 'Pasta', price: 960, discountPrice: 860, description: 'Elbow macaroni folded into cheddar, gouda & mozzarella baked under garlic breadcrumbs.', image: 'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=700&auto=format&fit=crop&q=80', badge: 'Popular', bestSeller: false, featured: true, diet: 'veg', spicy: 'None', reviews: 109 },
  { id: 'fb-14', name: 'Cheesy Garlic Bread Supreme (6 Pcs)', category: 'Appetizers', price: 490, description: 'Crusty baguette brushed with roasted garlic herb butter and baked under melted mozzarella.', image: 'https://images.unsplash.com/photo-1573140401552-3fab0b24306f?w=700&auto=format&fit=crop&q=80', badge: 'Best Seller', bestSeller: true, featured: false, diet: 'veg', spicy: 'None', reviews: 145 },
  { id: 'fb-15', name: 'Honey BBQ Glazed Wings (8 Pcs)', category: 'Appetizers', price: 720, description: 'Crispy jumbo chicken wings tossed in sticky smoky honey-hickory BBQ glaze & toasted sesame.', image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=700&auto=format&fit=crop&q=80', badge: 'Popular', bestSeller: true, featured: false, diet: 'nonveg', spicy: 'Mild', reviews: 138 },
  { id: 'fb-16', name: 'Golden Mozzarella Sticks (6 Pcs)', category: 'Appetizers', price: 590, description: 'Stretchy Italian mozzarella fried golden crisp and served with warm marinara dip.', image: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=700&auto=format&fit=crop&q=80', badge: 'Crunchy', bestSeller: false, featured: true, diet: 'veg', spicy: 'None', reviews: 92 },
  { id: 'fb-17', name: 'Smoked Chicken Panini Melt', category: 'Sandwiches', price: 720, description: 'Pressed sourdough panini stuffed with smoked chicken, cheddar, peppers & pesto mayo.', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=700&auto=format&fit=crop&q=80', badge: 'Popular', bestSeller: false, featured: false, diet: 'nonveg', spicy: 'Mild', reviews: 102 },
  { id: 'fb-18', name: 'Philly Cheesesteak Sub', category: 'Sandwiches', price: 890, description: 'Seared steak strips with caramelized onions, peppers & warm provolone cheese sauce.', image: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=700&auto=format&fit=crop&q=80', badge: 'Chef Special', bestSeller: false, featured: true, diet: 'nonveg', spicy: 'Mild', reviews: 114 },
  { id: 'fb-19', name: 'Salted Caramel Cold Coffee Frappe', category: 'Drinks', price: 490, description: 'Double espresso blended icy smooth with creamy milk, salted caramel swirl & whipped cream.', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=700&auto=format&fit=crop&q=80', badge: 'Best Seller', bestSeller: true, featured: false, diet: 'veg', spicy: 'None', reviews: 132 },
  { id: 'fb-20', name: 'Strawberry Basil Iced Cooler', category: 'Drinks', price: 360, description: 'Crushed ripe strawberries muddled with fresh garden basil, lime juice & sparkling soda.', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=700&auto=format&fit=crop&q=80', badge: 'Refreshing', bestSeller: false, featured: true, diet: 'veg', spicy: 'None', reviews: 89 },
  { id: 'fb-21', name: 'Warm Belgian Chocolate Lava Cake', category: 'Desserts', price: 590, description: 'Dark chocolate cake with a molten flowing fudge core, served warm with vanilla ice cream.', image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=700&auto=format&fit=crop&q=80', badge: 'Best Seller', bestSeller: true, featured: true, diet: 'veg', spicy: 'None', reviews: 178 },
  { id: 'fb-22', name: 'Classic Italian Tiramisu Cup', category: 'Desserts', price: 620, description: 'Espresso-soaked ladyfingers layered with whipped mascarpone cream & Dutch cocoa.', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=700&auto=format&fit=crop&q=80', badge: 'Chef Special', bestSeller: false, featured: true, diet: 'veg', spicy: 'None', reviews: 121 },
  { id: 'fb-23', name: 'Lotus Biscoff NY Cheesecake', category: 'Desserts', price: 680, description: 'Velvety baked New York cheesecake crowned with warm Lotus Biscoff cookie butter.', image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=700&auto=format&fit=crop&q=80', badge: 'Popular', bestSeller: false, featured: false, diet: 'veg', spicy: 'None', reviews: 144 },
  { id: 'fb-24', name: 'Family Pizza Feast Combo', category: 'Deals & Combos', price: 3890, discountPrice: 3190, description: '2 Large Signature Pizzas + 6 Cheesy Garlic Breads + 8 Honey BBQ Wings + 1.5L Drink.', image: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=700&auto=format&fit=crop&q=80', badge: 'Save Rs. 700', bestSeller: true, featured: true, diet: 'nonveg', spicy: 'Mild', reviews: 240 },
  { id: 'fb-25', name: 'Duo Date Night Pizza & Pasta Deal', category: 'Deals & Combos', price: 2790, discountPrice: 2290, description: '1 Medium Stone-Baked Pizza + 1 Fettuccine Alfredo + 4 Garlic Breads + 2 Mocktails.', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&auto=format&fit=crop&q=80', badge: 'Best Seller', bestSeller: true, featured: true, diet: 'nonveg', spicy: 'Mild', reviews: 168 },
  { id: 'fb-26', name: 'Smash Burger & Loaded Fries Box', category: 'Deals & Combos', price: 1550, discountPrice: 1290, description: '1 Double Beef Smash Burger + Loaded Cheesy Fries + 1 Chilled Drink + Garlic Dip.', image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=700&auto=format&fit=crop&q=80', badge: 'Value Deal', bestSeller: true, featured: false, diet: 'nonveg', spicy: 'Medium', reviews: 193 },
  { id: 'fb-27', name: 'Midnight Cravings Box', category: 'Deals & Combos', price: 2150, discountPrice: 1790, description: '1 Medium Pepperoni Pizza + 6 Mozzarella Sticks + 1 Lava Cake + 2 Chilled Cans.', image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=700&auto=format&fit=crop&q=80', badge: 'Save Rs. 360', bestSeller: false, featured: true, diet: 'nonveg', spicy: 'Mild', reviews: 112 }
];

export const FALLBACK_ITEMS = raw.map(i => ({
  ...i,
  categoryId: FALLBACK_CATEGORIES.find(c => c.name === i.category)?.id || 'cat-1',
  finalPrice: i.discountPrice ?? i.price,
  available: true,
  sizes: i.sizes || [],
  toppings: i.toppings || [],
  cheeseOptions: i.cheeseOptions || [],
  rating: 4.9
}));

