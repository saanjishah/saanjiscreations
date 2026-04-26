const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('../middleware/auth');

const DATA_FILE = path.join(__dirname, '../../data/techniques.json');

// Seed from static data if file doesn't exist yet
function ensureFile() {
  if (!fs.existsSync(DATA_FILE)) {
    // Copy the default techniques from the static file embedded here
    const defaults = require('../default-data').TECHNIQUES;
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaults, null, 2));
  }
}

function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeAll(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET /api/techniques
router.get('/', (req, res) => {
  res.json(readAll());
});

// POST /api/techniques — create (admin only)
router.post('/', requireAdmin, (req, res) => {
  const { id, name, icon, preview, steps, tip, relatedRecipes } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name are required.' });
  const all = readAll();
  if (all.find(t => t.id === id)) return res.status(409).json({ error: `Technique id "${id}" already exists.` });
  const item = { id, name, icon: icon || '📌', preview: preview || '', steps: steps || [], tip: tip || null, relatedRecipes: relatedRecipes || [] };
  all.push(item);
  writeAll(all);
  res.status(201).json(item);
});

// PUT /api/techniques/:id — update (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const all = readAll();
  const idx = all.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Technique not found.' });
  const { name, icon, preview, steps, tip, relatedRecipes } = req.body;
  all[idx] = {
    ...all[idx],
    name: name ?? all[idx].name,
    icon: icon ?? all[idx].icon,
    preview: preview ?? all[idx].preview,
    steps: steps ?? all[idx].steps,
    tip: tip ?? all[idx].tip,
    relatedRecipes: relatedRecipes ?? all[idx].relatedRecipes,
  };
  writeAll(all);
  res.json(all[idx]);
});

// DELETE /api/techniques/:id — delete (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const all = readAll();
  const idx = all.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Technique not found.' });
  all.splice(idx, 1);
  writeAll(all);
  res.json({ message: 'Deleted.' });
});

module.exports = router;
