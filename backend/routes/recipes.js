const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

// Safely import upload — handles both old (default export) and new (named export) upload.js
const uploadModule = require('../middleware/upload');
const upload             = uploadModule.upload || uploadModule;
const processAndSavePhoto = uploadModule.processAndSavePhoto || ((req, res, next) => next());

// GET /api/recipes
router.get('/', (req, res) => {
  let recipes = db.read('recipes');
  const { category, q } = req.query;
  if (category && category !== 'all' && category !== 'favorites') {
    recipes = recipes.filter(r => r.category === category);
  }
  if (q) {
    const query = q.toLowerCase();
    recipes = recipes.filter(r =>
      r.name.toLowerCase().includes(query) ||
      (r.description || '').toLowerCase().includes(query) ||
      (r.tags || []).some(t => t.toLowerCase().includes(query))
    );
  }
  res.json(recipes);
});

// GET /api/recipes/:id
router.get('/:id', (req, res) => {
  const recipe = db.findById('recipes', req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });
  res.json(recipe);
});

// POST /api/recipes
router.post('/', requireAdmin, upload.single('photo'), processAndSavePhoto, (req, res) => {
  const body = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
  if (!body.name) return res.status(400).json({ error: 'Recipe name is required.' });

  const photoPath = req.file
    ? (req.file.savedAs || `/uploads/recipes/${req.file.filename}`)
    : null;

  const recipe = db.insert('recipes', {
    id: uuidv4(),
    name: body.name,
    category: body.category || 'other',
    emoji: body.emoji || '',
    prep: body.prep || '',
    bake: body.bake || '',
    servings: Number(body.servings) || 12,
    tags: Array.isArray(body.tags) ? body.tags : (body.tags || '').split(',').map(s => s.trim()).filter(Boolean),
    description: body.description || '',
    sourceUrl: body.sourceUrl || null,
    hasVinegar: body.hasVinegar === true || body.hasVinegar === 'true',
    ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
    steps: Array.isArray(body.steps) ? body.steps : [],
    photo: photoPath,
  });
  res.status(201).json(recipe);
});

// PUT /api/recipes/:id
router.put('/:id', requireAdmin, upload.single('photo'), processAndSavePhoto, (req, res) => {
  const existing = db.findById('recipes', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Recipe not found.' });

  const body = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;

  const updates = {
    name:        body.name        ?? existing.name,
    category:    body.category    ?? existing.category,
    emoji:       body.emoji       ?? existing.emoji,
    prep:        body.prep        ?? existing.prep,
    bake:        body.bake        ?? existing.bake,
    servings:    body.servings    !== undefined ? Number(body.servings) : existing.servings,
    tags:        body.tags        !== undefined ? (Array.isArray(body.tags) ? body.tags : body.tags.split(',').map(s=>s.trim()).filter(Boolean)) : existing.tags,
    description: body.description ?? existing.description,
    sourceUrl:   body.sourceUrl   ?? existing.sourceUrl,
    hasVinegar:  body.hasVinegar  !== undefined ? (body.hasVinegar === true || body.hasVinegar === 'true') : existing.hasVinegar,
    ingredients: body.ingredients !== undefined ? (Array.isArray(body.ingredients) ? body.ingredients : []) : existing.ingredients,
    steps:       body.steps       !== undefined ? (Array.isArray(body.steps) ? body.steps : []) : existing.steps,
  };

  if (req.file) {
    updates.photo = req.file.savedAs || `/uploads/recipes/${req.file.filename}`;
    // Delete old photo
    if (existing.photo) {
      const fs   = require('fs');
      const path = require('path');
      const old  = path.join(__dirname, '../../frontend/public', existing.photo);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
  }

  res.json(db.update('recipes', req.params.id, updates));
});

// DELETE /api/recipes/:id
router.delete('/:id', requireAdmin, (req, res) => {
  const recipe = db.findById('recipes', req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });
  if (recipe.photo) {
    const fs   = require('fs');
    const path = require('path');
    const p    = path.join(__dirname, '../../frontend/public', recipe.photo);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.remove('recipes', req.params.id);
  res.json({ message: 'Recipe deleted.' });
});

module.exports = router;
