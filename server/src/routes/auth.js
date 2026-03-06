import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken } from '../auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { name, email, password, city, state } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, city, state)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email.toLowerCase(), password_hash, city || '', state || '');

  const user = db.prepare(`SELECT id, name, email, is_admin FROM users WHERE id = ?`).get(result.lastInsertRowid);
  res.json({ token: signToken(user), user: { ...user, isAdmin: !!user.is_admin } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get((email || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({
    token: signToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      city: user.city,
      state: user.state,
      isAdmin: !!user.is_admin
    }
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(`SELECT id, name, email, city, state, is_admin FROM users WHERE id = ?`).get(req.user.id);
  res.json({ ...user, isAdmin: !!user.is_admin });
});

export default router;
