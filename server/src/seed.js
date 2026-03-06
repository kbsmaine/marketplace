import bcrypt from 'bcryptjs';
import db from './db.js';

const categories = [
  ['Vehicles', 'vehicles'],
  ['Real Estate', 'real-estate'],
  ['Electronics', 'electronics'],
  ['Tools', 'tools'],
  ['Furniture', 'furniture'],
  ['Outdoor Gear', 'outdoor-gear'],
  ['Clothing', 'clothing'],
  ['Collectibles', 'collectibles'],
  ['Jobs', 'jobs'],
  ['Services', 'services']
];

for (const [name, slug] of categories) {
  db.prepare(`INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)`).run(name, slug);
}

const adminEmail = 'admin@marketsquare.local';
const existingAdmin = db.prepare(`SELECT id FROM users WHERE email = ?`).get(adminEmail);
if (!existingAdmin) {
  const hash = bcrypt.hashSync('Admin123!', 10);
  db.prepare(`
    INSERT INTO users (name, email, password_hash, city, state, is_admin)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run('Admin', adminEmail, hash, 'Portland', 'ME');
}
