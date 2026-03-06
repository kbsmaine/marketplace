import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const categories = db.prepare(`SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC`).all();
  res.json(categories);
});

export default router;
