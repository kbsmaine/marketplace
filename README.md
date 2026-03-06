# MarketSquare

A full-stack Craigslist-style classifieds marketplace engine with:
- User accounts and JWT auth
- Listing creation/editing/deletion
- Image uploads
- Categories and configurable category seed data
- Search, filters, and location-based browsing
- Buyer/seller messaging
- Favorites
- Reporting and moderation tools
- Admin dashboard
- Optional featured listings and Stripe-ready payment stub

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite (better-sqlite3)
- Deployable on VPS/DigitalOcean immediately; adaptable for Vercel frontend + external API host

## Quick start

### 1) Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
Backend runs on `http://localhost:4000`

### 2) Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

## Default admin
- Email: `admin@marketsquare.local`
- Password: `Admin123!`

Change this immediately after first login.

## Production notes
- Replace JWT secret in `server/.env`
- Put uploads on S3/Cloudflare R2 for production
- Move SQLite to PostgreSQL if you need scale
- Add email verification, password reset, rate limiting store, and stronger moderation rules before public launch

## Categories
Edit seeded categories in:
- `server/src/seed.js`

## Optional payments
This project includes a featured-listing payment stub. To fully enable payments:
- add Stripe keys in `server/.env`
- complete the checkout endpoint in `server/src/routes/payments.js`

## Deployment
### VPS / DigitalOcean
- Run backend with PM2
- Build frontend with `npm run build`
- Serve frontend via Nginx or `vite preview`

### Vercel
- Deploy `client` to Vercel
- Host `server` separately on a VPS, Render, Railway, or Fly.io
- Set `VITE_API_URL` to your deployed API URL
