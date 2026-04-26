const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { extractRecipeWithClaude } = require('../scrapers/claude-scraper');
const { extractRecipeWithScraper } = require('../scrapers/web-scraper');

/**
 * POST /api/autofill
 * Body: { url: string, mode?: "claude" | "scraper" }
 *
 * mode defaults to AUTOFILL_MODE env variable, then falls back to "claude".
 * If Claude is unavailable (no API key), automatically retries with the scraper.
 */
router.post('/', requireAdmin, async (req, res) => {
  const { url, mode } = req.body;

  if (!url) return res.status(400).json({ error: 'URL is required.' });

  // Determine mode: request body > env variable > default (claude)
  const resolvedMode = mode || process.env.AUTOFILL_MODE || 'claude';

  try {
    let data;

    if (resolvedMode === 'scraper') {
      data = await extractRecipeWithScraper(url);
      data._extractedBy = 'scraper';
    } else {
      // Try Claude first; fall back to scraper if no API key
      try {
        data = await extractRecipeWithClaude(url);
        data._extractedBy = 'claude';
      } catch (claudeErr) {
        if (claudeErr.message.includes('ANTHROPIC_API_KEY')) {
          // No key configured — silently fall back to scraper
          console.warn('[autofill] No Anthropic API key — falling back to web scraper.');
          data = await extractRecipeWithScraper(url);
          data._extractedBy = 'scraper (fallback: no API key)';
        } else {
          throw claudeErr;
        }
      }
    }

    res.json({ success: true, data });

  } catch (err) {
    console.error('[autofill] Error:', err.message);
    res.status(500).json({
      error: `Autofill failed: ${err.message}`,
      hint: 'Try switching to scraper mode, or fill in the recipe manually.'
    });
  }
});

/**
 * GET /api/autofill/mode
 * Returns current mode and whether Claude API key is configured.
 */
router.get('/mode', requireAdmin, (req, res) => {
  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here');
  res.json({
    currentMode: process.env.AUTOFILL_MODE || 'claude',
    claudeAvailable: hasApiKey,
    scraperAvailable: true,
  });
});

module.exports = router;
