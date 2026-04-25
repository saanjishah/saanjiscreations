const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/recipes — list all (with optional ?category= and ?q= filters)
router.get('/', (req, res) => {
  let recipes = db.read('recipes');
  const { category, q } = req.query;

  if (category && category !== 'all') {
    if (category === 'favorites') {
      // favorites are client-side only; return all and let client filter
    } else {
      recipes = recipes.filter(r => r.category === category);
    }
  }

  if (q) {
    const query = q.toLowerCase();
    recipes = recipes.filter(r =>
      r.name.toLowerCase().includes(query) ||
      (r.description || '').toLowerCase().includes(query) ||
      (r.tags || []).some(t => t.toLowerCase().includes(query)) ||
      (r.category || '').toLowerCase().includes(query)
    );
  }

  res.json(recipes);
});

// GET /api/recipes/:id — get one recipe
router.get('/:id', (req, res) => {
  const recipe = db.findById('recipes', req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });
  res.json(recipe);
});

// POST /api/recipes — create (admin only)
router.post('/', requireAdmin, upload.single('photo'), (req, res) => {
  const body = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

  if (!body.name) return res.status(400).json({ error: 'Recipe name is required.' });

  const recipe = db.insert('recipes', {
    id: uuidv4(),
    name: body.name,
    category: body.category || 'other',
    emoji: body.emoji || '🍰',
    prep: body.prep || '',
    bake: body.bake || '',
    servings: Number(body.servings) || 12,
    tags: Array.isArray(body.tags) ? body.tags : (body.tags || '').split(',').map(s => s.trim()).filter(Boolean),
    description: body.description || '',
    sourceUrl: body.sourceUrl || null,
    hasVinegar: body.hasVinegar === true || body.hasVinegar === 'true',
    ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
    steps: Array.isArray(body.steps) ? body.steps : [],
    photo: req.file ? `/uploads/recipes/${req.file.filename}` : null,
  });

  res.status(201).json(recipe);
});

// PUT /api/recipes/:id — update (admin only)
router.put('/:id', requireAdmin, upload.single('photo'), (req, res) => {
  const existing = db.findById('recipes', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Recipe not found.' });

  const body = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

  const updates = {
    name: body.name ?? existing.name,
    category: body.category ?? existing.category,
    emoji: body.emoji ?? existing.emoji,
    prep: body.prep ?? existing.prep,
    bake: body.bake ?? existing.bake,
    servings: body.servings !== undefined ? Number(body.servings) : existing.servings,
    tags: body.tags !== undefined
      ? (Array.isArray(body.tags) ? body.tags : body.tags.split(',').map(s => s.trim()).filter(Boolean))
      : existing.tags,
    description: body.description ?? existing.description,
    sourceUrl: body.sourceUrl ?? existing.sourceUrl,
    hasVinegar: body.hasVinegar !== undefined ? (body.hasVinegar === true || body.hasVinegar === 'true') : existing.hasVinegar,
    ingredients: body.ingredients !== undefined ? (Array.isArray(body.ingredients) ? body.ingredients : []) : existing.ingredients,
    steps: body.steps !== undefined ? (Array.isArray(body.steps) ? body.steps : []) : existing.steps,
  };

  // Update photo only if a new one was uploaded
  if (req.file) {
    updates.photo = `/uploads/recipes/${req.file.filename}`;
    // Optionally delete old photo here
  }

  const updated = db.update('recipes', req.params.id, updates);
  res.json(updated);
});

// DELETE /api/recipes/:id — delete (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const recipe = db.findById('recipes', req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });

  // Delete associated photo if it exists
  if (recipe.photo) {
    const fs = require('fs');
    const path = require('path');
    const photoPath = path.join(__dirname, '../../frontend/public', recipe.photo);
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
  }

  db.remove('recipes', req.params.id);
  res.json({ message: 'Recipe deleted.' });
});

module.exports = router;
