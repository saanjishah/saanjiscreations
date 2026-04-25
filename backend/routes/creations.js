const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/creations
router.get('/', (req, res) => {
  let creations = db.read('creations');
  const { event, q } = req.query;

  if (event && event !== 'all' && event !== 'favorites') {
    creations = creations.filter(c => c.event === event);
  }

  if (q) {
    const query = q.toLowerCase();
    creations = creations.filter(c =>
      c.name.toLowerCase().includes(query) ||
      (c.base || '').toLowerCase().includes(query) ||
      (c.decorations || '').toLowerCase().includes(query) ||
      (c.event || '').toLowerCase().includes(query)
    );
  }

  res.json(creations);
});

// GET /api/creations/:id
router.get('/:id', (req, res) => {
  const creation = db.findById('creations', req.params.id);
  if (!creation) return res.status(404).json({ error: 'Creation not found.' });
  res.json(creation);
});

// POST /api/creations — create (admin only)
router.post('/', requireAdmin, upload.single('photo'), (req, res) => {
  const body = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

  if (!body.name) return res.status(400).json({ error: 'Creation name is required.' });

  const creation = db.insert('creations', {
    id: uuidv4(),
    name: body.name,
    event: body.event || 'other',
    date: body.date || new Date().toISOString().split('T')[0],
    base: body.base || '',
    filling: body.filling || '',
    decorations: body.decorations || '',
    emoji: body.emoji || '🎂',
    favorite: body.favorite === true || body.favorite === 'true',
    photo: req.file ? `/uploads/creations/${req.file.filename}` : null,
  });

  res.status(201).json(creation);
});

// PUT /api/creations/:id — update (admin only)
router.put('/:id', requireAdmin, upload.single('photo'), (req, res) => {
  const existing = db.findById('creations', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Creation not found.' });

  const body = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

  const updates = {
    name: body.name ?? existing.name,
    event: body.event ?? existing.event,
    date: body.date ?? existing.date,
    base: body.base ?? existing.base,
    filling: body.filling ?? existing.filling,
    decorations: body.decorations ?? existing.decorations,
    emoji: body.emoji ?? existing.emoji,
    favorite: body.favorite !== undefined ? (body.favorite === true || body.favorite === 'true') : existing.favorite,
  };

  if (req.file) {
    updates.photo = `/uploads/creations/${req.file.filename}`;
  }

  const updated = db.update('creations', req.params.id, updates);
  res.json(updated);
});

// DELETE /api/creations/:id — delete (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const creation = db.findById('creations', req.params.id);
  if (!creation) return res.status(404).json({ error: 'Creation not found.' });

  if (creation.photo) {
    const fs = require('fs');
    const path = require('path');
    const photoPath = path.join(__dirname, '../../frontend/public', creation.photo);
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
  }

  db.remove('creations', req.params.id);
  res.json({ message: 'Creation deleted.' });
});

module.exports = router;
