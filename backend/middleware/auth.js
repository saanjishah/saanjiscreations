/**
 * middleware/auth.js
 * Simple token-based admin authentication middleware.
 * The token is just a signed session — no JWT library needed for a personal site.
 */

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'saanji2024';
// A simple in-memory set of valid session tokens (resets on server restart)
const validTokens = new Set();

/**
 * Generate a random session token.
 */
function generateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Login: validate password and return a session token.
 */
function login(password) {
  if (password !== ADMIN_PASSWORD) return null;
  const token = generateToken();
  validTokens.add(token);
  return token;
}

/**
 * Logout: invalidate a session token.
 */
function logout(token) {
  validTokens.delete(token);
}

/**
 * Express middleware: require valid admin token.
 * Expects: Authorization: Bearer <token>
 */
function requireAdmin(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized — admin access required.' });
  }
  next();
}

module.exports = { login, logout, requireAdmin };
