# MarketSquare

A working Craigslist-style classifieds marketplace engine with a Node.js + Express API and a lightweight vanilla frontend.

## Features
- User registration and login with JWT auth
- Listing creation, editing, deletion
- Image uploads
- Categories
- Search and filters
- Location fields (city/state/ZIP + optional lat/lng)
- Buyer/seller messaging
- Favorites
- Reporting and moderation
- Admin dashboard
- Featured-listing payment stub

## Stack
- Backend: Node.js + Express + SQLite
- Frontend: Vanilla HTML/CSS/JS

## Run locally

### 1) Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
API runs at `http://localhost:4000`

### 2) Frontend
```bash
cd client
npm run dev
```
Frontend runs at `http://localhost:5173`

## Default admin
- Email: `admin@marketsquare.local`
- Password: `Admin123!`

## Deployment
- VPS / DigitalOcean: run the backend with PM2, serve the client with Nginx or `serve`
- Vercel: host the `client` folder as a static site, and host `server` separately on a VPS, Railway, Render, or Fly.io

## Notes
- Uploaded images are stored locally in `server/uploads`
- The featured-listing payment route is a stub that marks a listing as featured for demo/testing
- Categories are seeded in `server/src/seed.js`
