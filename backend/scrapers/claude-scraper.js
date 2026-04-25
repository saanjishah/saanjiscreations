/**
 * scrapers/claude-scraper.js
 * Uses the Anthropic API to extract structured recipe data from a URL.
 * Requires ANTHROPIC_API_KEY in .env
 */

const fetch = require('node-fetch');

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

async function extractRecipeWithClaude(url) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY is not set in .env');
  }

  const response = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Please extract recipe information from this URL: ${url}

Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:
{
  "name": "string — recipe name",
  "category": "cakes | cupcakes | cookies | frosting | other",
  "emoji": "one relevant emoji",
  "prep": "string e.g. '20 min'",
  "bake": "string e.g. '35 min'",
  "servings": number,
  "description": "1–2 sentence description",
  "tags": ["array", "of", "tags"],
  "hasVinegar": boolean,
  "ingredients": [
    {
      "id": "i1",
      "name": "ingredient name",
      "amount": number,
      "unit": "cup | tbsp | tsp | g | kg | oz | lb | ml | l | null",
      "grams": number or null,
      "isSubstituted": false,
      "originalName": null
    }
  ],
  "steps": [
    {
      "title": "short step title",
      "text": "full step description",
      "tip": "optional tip string or null",
      "technique": "technique id if relevant: flaxseed-egg | piping-bag | melting-chocolate | how-to-line-pan | vegan-substitutes | null"
    }
  ]
}

For ingredients with vinegar: set isSubstituted=true, set name to the lemon juice equivalent, set originalName to the original vinegar name.
If you cannot access the URL, extract what you can from the URL itself and fill in reasonable defaults.`
      }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();

  return JSON.parse(clean);
}

module.exports = { extractRecipeWithClaude };
