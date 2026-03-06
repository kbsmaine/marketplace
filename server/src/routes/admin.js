import { Router } from 'express';
import db from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/dashboard', (_req, res) => {
  const stats = {
    users: db.prepare(`SELECT COUNT(*) AS count FROM users`).get().count,
    listings: db.prepare(`SELECT COUNT(*) AS count FROM listings`).get().count,
    activeListings: db.prepare(`SELECT COUNT(*) AS count FROM listings WHERE status = 'active'`).get().count,
    reportsOpen: db.prepare(`SELECT COUNT(*) AS count FROM reports WHERE status = 'open'`).get().count,
    conversations: db.prepare(`SELECT COUNT(*) AS count FROM conversations`).get().count
  };

  const recentReports = db.prepare(`
    SELECT r.*, u.name AS reporter_name, l.title AS listing_title
    FROM reports r
    JOIN users u ON u.id = r.reporter_id
    LEFT JOIN listings l ON l.id = r.listing_id
    ORDER BY r.created_at DESC
    LIMIT 25
  `).all();

  const recentListings = db.prepare(`
    SELECT l.*, u.name AS seller_name
    FROM listings l
    JOIN users u ON u.id = l.user_id
    ORDER BY l.created_at DESC
    LIMIT 25
  `).all();

  res.json({ stats, recentReports, recentListings });
});

router.patch('/reports/:id', (req, res) => {
  const { status } = req.body;
  db.prepare(`UPDATE reports SET status = ? WHERE id = ?`).run(status || 'closed', req.params.id);
  res.json({ success: true });
});

router.patch('/listings/:id', (req, res) => {
  const { status, is_featured } = req.body;
  db.prepare(`UPDATE listings SET status = COALESCE(?, status), is_featured = COALESCE(?, is_featured), updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(status ?? null, typeof is_featured === 'number' ? is_featured : null, req.params.id);
  res.json({ success: true });
});

router.get('/users', (_req, res) => {
  const users = db.prepare(`SELECT id, name, email, city, state, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT 100`).all();
  res.json(users);
});

export default router;
