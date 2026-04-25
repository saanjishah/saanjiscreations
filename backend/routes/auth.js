const express = require('express');
const router = express.Router();
const { login, logout } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  const token = login(password);
  if (!token) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  res.json({ token, message: 'Logged in successfully.' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  logout(token);
  res.json({ message: 'Logged out.' });
});

module.exports = router;
