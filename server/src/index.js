import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import './seed.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import listingRoutes from './routes/listings.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve('src/uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
