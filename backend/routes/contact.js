/**
 * routes/contact.js
 * Proxies contact form submissions to Google Sheets via a Google Apps Script URL.
 *
 * Setup:
 * 1. Go to https://sheets.google.com and create a sheet with columns:
 *    Timestamp | Name | Email | Subject | Message | Page
 * 2. In the sheet, go to Extensions → Apps Script
 * 3. Paste the Apps Script code from README (doPost function)
 * 4. Deploy → New deployment → Web app → Anyone can access
 * 5. Copy the Web App URL into .env as GOOGLE_SHEETS_URL
 */

const express = require('express');
const router  = express.Router();
const fetch   = require('node-fetch');

const SHEETS_URL = process.env.GOOGLE_SHEETS_URL;

router.post('/', async (req, res) => {
  const { name, email, subject, message, timestamp, page } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  if (!SHEETS_URL) {
    // No Sheets URL configured — log and return success anyway
    // (prevents exposing config issues to users)
    console.log('[contact] No GOOGLE_SHEETS_URL set. Form submission:', { name, email, subject });
    return res.json({ ok: true, note: 'Logged locally (no Sheets URL configured)' });
  }

  try {
    const response = await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message, timestamp, page }),
      timeout: 8000,
    });

    // Google Apps Script returns 200 even for errors, check response text
    const text = await response.text();
    if (text.toLowerCase().includes('error')) {
      throw new Error('Sheets script returned an error: ' + text.slice(0, 120));
    }

    console.log(`[contact] Form submitted by ${name} <${email}>`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[contact] Sheets submission failed:', err.message);
    res.status(500).json({ error: 'Could not forward to Google Sheets: ' + err.message });
  }
});

module.exports = router;
