# 🍕 Oma's Pizza & Fast Food - Full POS Web Application

A full-stack, state-of-the-art Point of Sale (POS) and online ordering application for **Oma's Pizza & Fast Food**. Built with React 19, Vite, Express.js, and an ultra-modern Red & Black luxury restaurant theme.

---

## ✨ Features

- 🍕 **Multi-Category Menu**:
  - **Fast Food**: Supreme Pizzas, Double Beef Smash Burgers, Crispy Zinger Burgers, Special Shawarma Rolls, Loaded Cheesy Fries, Buffalo Wings.
  - **Desi Food & BBQ**: Butter Chicken Karahi, Mutton Shinwari, Charcoal Chicken Tikka, Creamy Malai Boti, Seekh Kabab, Dum Biryani.
  - **Authentic Chinese**: Special Chicken Chowmein, Egg & Chicken Fried Rice, Chicken Manchurian, Chicken Shashlik, Spring Rolls.
  - **Beverages & Drinks**: Mint Margarita Slush, Thick Oreo Milkshake, Chilled Sodas.
- 📸 **High-Definition Real Food Imagery**: Every dish features royalty-free food photography.
- ⚡ **Images as Interactive Buttons**: Tap on any food image to quick-add it to your order.
- 🛒 **Dynamic Cart & Bill Calculation**: Real-time quantity steppers (`+` and `-`), item deletion, subtotal calculation, delivery fee rules, and grand total.
- 💵 **Cash on Delivery (COD) Checkout**: Frictionless checkout capturing Customer Full Name, Phone Number, Delivery Address, and Special Notes.
- 📧 **Instant Email Order Dispatch**: Automatically dispatches all order and customer details to `moiiizyyy@gmail.com`.
- 🖨️ **Printable POS Receipt & WhatsApp Share**: Realistic 80mm thermal receipt generator with 1-click printing and WhatsApp order sharing.
- 🔒 **Discreet Admin Control Portal**:
  - Discreet access button in navbar / footer.
  - Secure authentication: `admin@omas.com` / `Adminofomas1`.
  - **Upload New Dishes**: Custom name, category, price, description, and image URL (with 1-click HD presets or file upload). Newly added items instantly align into the menu grid with full functionality!
  - **Manage Menu**: View active items, delete, or update dishes.
  - **Live Order Tickets**: Real-time incoming order dashboard with status updater (Pending, Preparing, Out for Delivery, Delivered).
- 📱 **100% Fully Responsive**: Pixel-perfect design on mobile phones, tablets, laptops, and ultra-wide screens.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Vanilla CSS Design System, Responsive Media Queries
- **Backend**: Node.js, Express.js, Native CORS, Persistent JSON Database
- **Notifications**: FormSubmit Live Dispatch & SMTP Relay to `moiiizyyy@gmail.com`

---

## 🚀 Running Locally

### 1. Start the Backend Server
```bash
cd "oma's backend"
npm install
npm start
```
> The Express API will start on `http://localhost:5000`

### 2. Start the Frontend Application
```bash
cd "oma's fastfood/vite-project"
npm install
npm run dev
```
> The Vite dev server will start on `http://localhost:5173`

---

## 🔐 Admin Credentials

- **Email**: `admin@omas.com`
- **Password**: `Adminofomas1`
- **Access**: Click the subtle lock icon (`🔒`) in the navbar or footer.

---

## 🌐 Deploying Live

### Frontend (Vercel / Netlify)
1. Push this repository to GitHub.
2. Link the repository to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. Set the **Root Directory** to `oma's fastfood/vite-project`.
4. Build command: `npm run build`
5. Output directory: `dist`

### Backend (Render / Railway)
1. In [Render](https://render.com) or [Railway](https://railway.app), create a new **Web Service**.
2. Set the **Root Directory** to `oma's backend`.
3. Start command: `node server.js`
4. Set environment variable `PORT=5000`.

---

© 2026 Oma's Pizza & Fast Food. All Rights Reserved.
