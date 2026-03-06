import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

function listingSelect(currentUserId = null) {
  return `
    SELECT
      l.*,
      c.name AS category_name,
      c.slug AS category_slug,
      u.name AS seller_name,
      u.email AS seller_email,
      EXISTS(SELECT 1 FROM favorites f WHERE f.listing_id = l.id AND f.user_id = ${currentUserId ? Number(currentUserId) : -1}) AS is_favorite
    FROM listings l
    LEFT JOIN categories c ON c.id = l.category_id
    LEFT JOIN users u ON u.id = l.user_id
  `;
}

router.get('/mine', requireAuth, (req, res) => {
  const listings = db.prepare(`${listingSelect(req.user.id)} WHERE l.user_id = ? ORDER BY l.created_at DESC`).all(req.user.id).map((row) => ({
    ...row,
    images: db.prepare(`SELECT * FROM listing_images WHERE listing_id = ? ORDER BY sort_order ASC, id ASC`).all(row.id)
  }));
  res.json(listings);
});

router.get('/user/favorites/all', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT l.*,
      c.name AS category_name,
      u.name AS seller_name
    FROM favorites f
    JOIN listings l ON l.id = f.listing_id
    LEFT JOIN categories c ON c.id = l.category_id
    LEFT JOIN users u ON u.id = l.user_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id).map((row) => ({
    ...row,
    images: db.prepare(`SELECT * FROM listing_images WHERE listing_id = ? ORDER BY sort_order ASC, id ASC`).all(row.id)
  }));
  res.json(rows);
});

router.get('/', (req, res) => {
  const { q = '', category = '', city = '', state = '', minPrice = '', maxPrice = '', featured = '' } = req.query;
  const conditions = [`l.status = 'active'`];
  const params = [];

  if (q) {
    conditions.push(`(l.title LIKE ? OR l.description LIKE ?)`);
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    conditions.push(`c.slug = ?`);
    params.push(category);
  }
  if (city) {
    conditions.push(`l.city LIKE ?`);
    params.push(`%${city}%`);
  }
  if (state) {
    conditions.push(`l.state LIKE ?`);
    params.push(`%${state}%`);
  }
  if (minPrice) {
    conditions.push(`l.price >= ?`);
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    conditions.push(`l.price <= ?`);
    params.push(Number(maxPrice));
  }
  if (featured === 'true') conditions.push(`l.is_featured = 1`);

  const sql = `${listingSelect()} WHERE ${conditions.join(' AND ')} ORDER BY l.is_featured DESC, l.created_at DESC`;
  const listings = db.prepare(sql).all(...params).map((row) => ({
    ...row,
    images: db.prepare(`SELECT * FROM listing_images WHERE listing_id = ? ORDER BY sort_order ASC, id ASC`).all(row.id)
  }));

  res.json(listings);
});

router.get('/:id', (req, res) => {
  const listing = db.prepare(`${listingSelect()} WHERE l.id = ?`).get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  listing.images = db.prepare(`SELECT * FROM listing_images WHERE listing_id = ? ORDER BY sort_order ASC, id ASC`).all(listing.id);
  res.json(listing);
});

router.post('/', requireAuth, upload.array('images', 6), (req, res) => {
  const { title, description, price, category_id, city, state, zipcode, latitude, longitude } = req.body;
  if (!title || !description || !price) return res.status(400).json({ error: 'Missing required fields' });

  const result = db.prepare(`
    INSERT INTO listings (user_id, title, description, price, category_id, city, state, zipcode, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    title,
    description,
    Number(price),
    category_id || null,
    city || '',
    state || '',
    zipcode || '',
    latitude ? Number(latitude) : null,
    longitude ? Number(longitude) : null
  );

  const listingId = result.lastInsertRowid;
  (req.files || []).forEach((file, index) => {
    db.prepare(`INSERT INTO listing_images (listing_id, file_path, sort_order) VALUES (?, ?, ?)`)
      .run(listingId, `/uploads/${file.filename}`, index);
  });

  res.json({ success: true, listingId });
});

router.put('/:id', requireAuth, upload.array('images', 6), (req, res) => {
  const listing = db.prepare(`SELECT * FROM listings WHERE id = ?`).get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });

  const { title, description, price, category_id, city, state, zipcode, latitude, longitude, status } = req.body;
  db.prepare(`
    UPDATE listings
    SET title = ?, description = ?, price = ?, category_id = ?, city = ?, state = ?, zipcode = ?, latitude = ?, longitude = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || listing.title,
    description || listing.description,
    price ? Number(price) : listing.price,
    category_id || listing.category_id,
    city ?? listing.city,
    state ?? listing.state,
    zipcode ?? listing.zipcode,
    latitude ? Number(latitude) : listing.latitude,
    longitude ? Number(longitude) : listing.longitude,
    status || listing.status,
    listing.id
  );

  const replaceImages = String(req.body.replaceImages || 'false') === 'true';
  if (replaceImages) {
    db.prepare(`DELETE FROM listing_images WHERE listing_id = ?`).run(listing.id);
  }
  (req.files || []).forEach((file, index) => {
    db.prepare(`INSERT INTO listing_images (listing_id, file_path, sort_order) VALUES (?, ?, ?)`)
      .run(listing.id, `/uploads/${file.filename}`, index);
  });

  res.json({ success: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  const listing = db.prepare(`SELECT * FROM listings WHERE id = ?`).get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });

  db.prepare(`DELETE FROM listing_images WHERE listing_id = ?`).run(listing.id);
  db.prepare(`DELETE FROM favorites WHERE listing_id = ?`).run(listing.id);
  db.prepare(`DELETE FROM listings WHERE id = ?`).run(listing.id);
  res.json({ success: true });
});

router.post('/:id/favorite', requireAuth, (req, res) => {
  db.prepare(`INSERT OR IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)`).run(req.user.id, req.params.id);
  res.json({ success: true });
});

router.delete('/:id/favorite', requireAuth, (req, res) => {
  db.prepare(`DELETE FROM favorites WHERE user_id = ? AND listing_id = ?`).run(req.user.id, req.params.id);
  res.json({ success: true });
});

router.post('/:id/report', requireAuth, (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  db.prepare(`INSERT INTO reports (reporter_id, listing_id, message) VALUES (?, ?, ?)`).run(req.user.id, req.params.id, message);
  res.json({ success: true });
});

export default router;
