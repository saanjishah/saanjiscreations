require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../frontend/public/uploads')));

// ── Routes ──────────────────────────────────────────
const recipesRouter = require('./routes/recipes');
const creationsRouter = require('./routes/creations');
const autofillRouter = require('./routes/autofill');
const authRouter = require('./routes/auth');
const techniquesRouter = require('./routes/techniques');
const tipsRouter = require('./routes/tips');

app.use('/api/recipes', recipesRouter);
app.use('/api/creations', creationsRouter);
app.use('/api/autofill', autofillRouter);
app.use('/api/auth', authRouter);
app.use('/api/techniques', techniquesRouter);
app.use('/api/tips', tipsRouter);

// ── Catch-all: serve frontend ───────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ── Start ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎂 Saanji's Creations server running at http://localhost:${PORT}`);
  console.log(`📁 Data stored in: /data/`);
  console.log(`🔧 Autofill mode: ${process.env.AUTOFILL_MODE || 'claude'}\n`);
});
