import bcrypt from 'bcryptjs';
import db from './db.js';

const categories = [
  ['Vehicles', 'vehicles'],
  ['Electronics', 'electronics'],
  ['Tools', 'tools'],
  ['Furniture', 'furniture'],
  ['Outdoor Gear', 'outdoor-gear'],
  ['Collectibles', 'collectibles'],
  ['Farm & Garden', 'farm-garden'],
  ['Clothing', 'clothing'],
  ['Services', 'services'],
  ['Other', 'other']
];

const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)');
for (const [name, slug] of categories) insertCategory.run(name, slug);

const adminEmail = 'admin@marketsquare.local';
const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!exists) {
  const hash = bcrypt.hashSync('Admin123!', 10);
  db.prepare('INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, 1)').run('Admin', adminEmail, hash);
}

console.log('Database seeded.');
