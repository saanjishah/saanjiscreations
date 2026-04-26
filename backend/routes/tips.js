const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('../middleware/auth');

const DATA_FILE = path.join(__dirname, '../../data/tips.json');

function ensureFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const defaults = require('../default-data').TIPS;
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

// GET /api/tips
router.get('/', (req, res) => {
  res.json(readAll());
});

// POST /api/tips — create (admin only)
router.post('/', requireAdmin, (req, res) => {
  const { icon, title, text } = req.body;
  if (!title || !text) return res.status(400).json({ error: 'title and text are required.' });
  const item = { icon: icon || '💡', title, text };
  const all = readAll();
  all.push(item);
  writeAll(all);
  res.status(201).json(item);
});

// PUT /api/tips/:index — update by array index (admin only)
router.put('/:index', requireAdmin, (req, res) => {
  const all = readAll();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || idx < 0 || idx >= all.length) return res.status(404).json({ error: 'Tip not found.' });
  const { icon, title, text } = req.body;
  all[idx] = {
    icon: icon ?? all[idx].icon,
    title: title ?? all[idx].title,
    text: text ?? all[idx].text,
  };
  writeAll(all);
  res.json(all[idx]);
});

// DELETE /api/tips/:index — delete by array index (admin only)
router.delete('/:index', requireAdmin, (req, res) => {
  const all = readAll();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || idx < 0 || idx >= all.length) return res.status(404).json({ error: 'Tip not found.' });
  all.splice(idx, 1);
  writeAll(all);
  res.json({ message: 'Deleted.' });
});

module.exports = router;
