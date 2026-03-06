import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import db from './db.js';
import './seed.js';
import bcrypt from 'bcryptjs';
import { requireAuth, requireAdmin, signToken } from './auth.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: clientUrl, credentials: false }));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

const uploadDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});
const upload = multer({ storage });

const categoryMap = `LEFT JOIN categories c ON c.id = l.category_id`;
const userMap = `LEFT JOIN users u ON u.id = l.user_id`;

function listingSelect(extra = '') {
  return `
    SELECT l.*, c.name as category_name, c.slug as category_slug,
           u.name as seller_name,
           EXISTS(SELECT 1 FROM reports r WHERE r.listing_id = l.id AND r.status = 'open') as has_open_reports
    FROM listings l
    ${categoryMap}
    ${userMap}
    ${extra}
  `;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already in use' });
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email.toLowerCase(), hash);
  const user = db.prepare('SELECT id, name, email, is_admin FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.json({ token: signToken(user), user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').toLowerCase());
  if (!userRow || !bcrypt.compareSync(password || '', userRow.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const user = { id: userRow.id, name: userRow.name, email: userRow.email, is_admin: userRow.is_admin };
  res.json({ token: signToken(user), user });
});

app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));
app.get('/api/categories', (_req, res) => res.json(db.prepare('SELECT * FROM categories ORDER BY name').all()));

app.get('/api/listings', (req, res) => {
  const { q = '', category = '', city = '', state = '', minPrice = '', maxPrice = '', featured = '', status = 'active' } = req.query;
  const where = ['1=1'];
  const params = [];
  if (status) { where.push('l.status = ?'); params.push(status); }
  if (q) { where.push('(l.title LIKE ? OR l.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (city) { where.push('l.city LIKE ?'); params.push(`%${city}%`); }
  if (state) { where.push('l.state LIKE ?'); params.push(`%${state}%`); }
  if (minPrice !== '') { where.push('l.price >= ?'); params.push(Number(minPrice)); }
  if (maxPrice !== '') { where.push('l.price <= ?'); params.push(Number(maxPrice)); }
  if (featured) { where.push('l.is_featured = 1'); }
  const rows = db.prepare(`${listingSelect()} WHERE ${where.join(' AND ')} ORDER BY l.is_featured DESC, l.created_at DESC`).all(...params);
  res.json(rows);
});

app.get('/api/listings/:id', (req, res) => {
  const row = db.prepare(`${listingSelect()} WHERE l.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Listing not found' });
  res.json(row);
});

app.post('/api/listings', requireAuth, upload.single('image'), (req, res) => {
  const { title, description, price = 0, category_id = null, city = '', state = '', zip = '', latitude = null, longitude = null } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const result = db.prepare(`
    INSERT INTO listings (user_id, category_id, title, description, price, city, state, zip, latitude, longitude, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, category_id || null, title, description, Number(price) || 0, city, state, zip, latitude || null, longitude || null, image_url);
  res.json(db.prepare(`${listingSelect()} WHERE l.id = ?`).get(result.lastInsertRowid));
});

app.put('/api/listings/:id', requireAuth, upload.single('image'), (req, res) => {
  const current = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Listing not found' });
  if (current.user_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Not allowed' });
  const { title = current.title, description = current.description, price = current.price, category_id = current.category_id, city = current.city, state = current.state, zip = current.zip, latitude = current.latitude, longitude = current.longitude, status = current.status } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : current.image_url;
  db.prepare(`
    UPDATE listings SET title=?, description=?, price=?, category_id=?, city=?, state=?, zip=?, latitude=?, longitude=?, image_url=?, status=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(title, description, Number(price) || 0, category_id || null, city, state, zip, latitude || null, longitude || null, image_url, status, req.params.id);
  res.json(db.prepare(`${listingSelect()} WHERE l.id = ?`).get(req.params.id));
});

app.delete('/api/listings/:id', requireAuth, (req, res) => {
  const current = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Listing not found' });
  if (current.user_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Not allowed' });
  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/my/listings', requireAuth, (req, res) => {
  res.json(db.prepare(`${listingSelect()} WHERE l.user_id = ? ORDER BY l.created_at DESC`).all(req.user.id));
});

app.get('/api/messages', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT m.*, s.name as sender_name, r.name as receiver_name, l.title as listing_title
    FROM messages m
    LEFT JOIN users s ON s.id = m.sender_id
    LEFT JOIN users r ON r.id = m.receiver_id
    LEFT JOIN listings l ON l.id = m.listing_id
    WHERE m.sender_id = ? OR m.receiver_id = ?
    ORDER BY m.created_at DESC
  `).all(req.user.id, req.user.id);
  res.json(rows);
});

app.post('/api/messages', requireAuth, (req, res) => {
  const { listing_id, receiver_id, body } = req.body;
  if (!listing_id || !receiver_id || !body) return res.status(400).json({ error: 'listing_id, receiver_id, and body are required' });
  const listing = db.prepare('SELECT id FROM listings WHERE id = ?').get(listing_id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  const result = db.prepare('INSERT INTO messages (listing_id, sender_id, receiver_id, body) VALUES (?, ?, ?, ?)').run(listing_id, req.user.id, receiver_id, body);
  res.json(db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid));
});

app.get('/api/favorites', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT f.id as favorite_id, l.*, c.name as category_name, c.slug as category_slug
    FROM favorites f
    JOIN listings l ON l.id = f.listing_id
    LEFT JOIN categories c ON c.id = l.category_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json(rows);
});

app.post('/api/favorites/:listingId', requireAuth, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)').run(req.user.id, req.params.listingId);
  res.json({ success: true });
});

app.delete('/api/favorites/:listingId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?').run(req.user.id, req.params.listingId);
  res.json({ success: true });
});

app.post('/api/reports', requireAuth, (req, res) => {
  const { listing_id, reason } = req.body;
  if (!listing_id || !reason) return res.status(400).json({ error: 'listing_id and reason are required' });
  db.prepare('INSERT INTO reports (user_id, listing_id, reason) VALUES (?, ?, ?)').run(req.user.id, listing_id, reason);
  res.json({ success: true });
});

app.post('/api/payments/feature/:listingId', requireAuth, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Not allowed' });
  db.prepare('UPDATE listings SET is_featured = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.listingId);
  res.json({ success: true, message: 'Featured listing stub enabled. Replace this route with Stripe checkout for production.' });
});

app.get('/api/admin/stats', requireAuth, requireAdmin, (_req, res) => {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const listings = db.prepare('SELECT COUNT(*) as count FROM listings').get().count;
  const active = db.prepare("SELECT COUNT(*) as count FROM listings WHERE status='active'").get().count;
  const openReports = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status='open'").get().count;
  res.json({ users, listings, active, openReports });
});

app.get('/api/admin/reports', requireAuth, requireAdmin, (_req, res) => {
  const rows = db.prepare(`
    SELECT r.*, l.title as listing_title, u.name as reporter_name
    FROM reports r
    LEFT JOIN listings l ON l.id = r.listing_id
    LEFT JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
  `).all();
  res.json(rows);
});

app.patch('/api/admin/reports/:id', requireAuth, requireAdmin, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status || 'closed', req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/listings', requireAuth, requireAdmin, (_req, res) => {
  res.json(db.prepare(`${listingSelect()} ORDER BY l.created_at DESC`).all());
});

app.patch('/api/admin/listings/:id', requireAuth, requireAdmin, (req, res) => {
  const { status, is_featured } = req.body;
  db.prepare('UPDATE listings SET status = COALESCE(?, status), is_featured = COALESCE(?, is_featured), updated_at=CURRENT_TIMESTAMP WHERE id = ?').run(status ?? null, typeof is_featured === 'number' ? is_featured : null, req.params.id);
  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`MarketSquare API running on http://localhost:${port}`);
});
