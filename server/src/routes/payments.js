import { Router } from 'express';
import Stripe from 'stripe';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/featured-checkout', async (req, res) => {
  const { listingId } = req.body;
  const listing = db.prepare(`SELECT * FROM listings WHERE id = ?`).get(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const amountCents = 999;
  const payment = db.prepare(`
    INSERT INTO featured_payments (listing_id, user_id, amount_cents)
    VALUES (?, ?, ?)
  `).run(listing.id, req.user.id, amountCents);

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({
      success: false,
      message: 'Stripe key not configured yet. Payment stub created successfully.',
      paymentId: payment.lastInsertRowid
    });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Feature listing: ${listing.title}` },
        unit_amount: amountCents
      },
      quantity: 1
    }],
    success_url: `${process.env.CLIENT_URL}/dashboard?featured=success`,
    cancel_url: `${process.env.CLIENT_URL}/dashboard?featured=cancelled`
  });

  db.prepare(`UPDATE featured_payments SET provider_session_id = ? WHERE id = ?`).run(session.id, payment.lastInsertRowid);
  res.json({ success: true, url: session.url });
});

export default router;
