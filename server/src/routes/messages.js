import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/conversations', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, l.title AS listing_title,
      buyer.name AS buyer_name,
      seller.name AS seller_name,
      (
        SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1
      ) AS last_message,
      (
        SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1
      ) AS last_message_at
    FROM conversations c
    JOIN listings l ON l.id = c.listing_id
    JOIN users buyer ON buyer.id = c.buyer_id
    JOIN users seller ON seller.id = c.seller_id
    WHERE c.buyer_id = ? OR c.seller_id = ?
    ORDER BY COALESCE(last_message_at, c.created_at) DESC
  `).all(req.user.id, req.user.id);
  res.json(rows);
});

router.get('/conversations/:id', (req, res) => {
  const conversation = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  if (![conversation.buyer_id, conversation.seller_id].includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });

  const messages = db.prepare(`
    SELECT m.*, u.name AS sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE conversation_id = ?
    ORDER BY m.created_at ASC, m.id ASC
  `).all(req.params.id);

  res.json({ conversation, messages });
});

router.post('/start', (req, res) => {
  const { listingId, body } = req.body;
  const listing = db.prepare(`SELECT * FROM listings WHERE id = ?`).get(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.user_id === req.user.id) return res.status(400).json({ error: 'Cannot message your own listing' });

  db.prepare(`
    INSERT OR IGNORE INTO conversations (listing_id, buyer_id, seller_id)
    VALUES (?, ?, ?)
  `).run(listing.id, req.user.id, listing.user_id);

  const conversation = db.prepare(`SELECT * FROM conversations WHERE listing_id = ? AND buyer_id = ? AND seller_id = ?`)
    .get(listing.id, req.user.id, listing.user_id);

  if (body?.trim()) {
    db.prepare(`INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)`).run(conversation.id, req.user.id, body.trim());
  }

  res.json({ success: true, conversationId: conversation.id });
});

router.post('/conversations/:id', (req, res) => {
  const { body } = req.body;
  const conversation = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  if (![conversation.buyer_id, conversation.seller_id].includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  if (!body?.trim()) return res.status(400).json({ error: 'Message is required' });

  db.prepare(`INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)`).run(conversation.id, req.user.id, body.trim());
  res.json({ success: true });
});

export default router;
