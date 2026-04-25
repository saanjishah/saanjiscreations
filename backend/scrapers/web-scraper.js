/**
 * scrapers/web-scraper.js
 * Built-in recipe scraper using cheerio — no API key required.
 * Supports JSON-LD schema.org/Recipe (used by most major recipe sites),
 * with fallback to heuristic HTML parsing.
 *
 * Supported sites with JSON-LD: Minimalist Baker, AllRecipes, Food Network,
 * Serious Eats, NYT Cooking, King Arthur, Sally's Baking Addiction, and most
 * WordPress recipe plugin sites (Tasty Recipes, WP Recipe Maker, etc.)
 */

const fetch = require('node-fetch');
const cheerio = require('cheerio');

/**
 * Main entry: fetch URL and extract recipe.
 */
async function extractRecipeWithScraper(url) {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  // 1. Try JSON-LD first (most reliable)
  const jsonLd = extractJsonLd($);
  if (jsonLd) return normalizeJsonLd(jsonLd, url);

  // 2. Fallback: heuristic HTML scraping
  return extractHeuristic($, url);
}

// ── Fetch ────────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SaanjisCreationsScraper/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 10000,
  });

  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  return res.text();
}

// ── JSON-LD Extraction ───────────────────────────────────────────────────────

function extractJsonLd($) {
  let result = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (result) return;
    try {
      const raw = $(el).html();
      const data = JSON.parse(raw);
      const candidates = Array.isArray(data) ? data : [data, ...(data['@graph'] || [])];
      for (const item of candidates) {
        if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
          result = item;
          return;
        }
      }
    } catch { /* malformed JSON-LD, skip */ }
  });

  return result;
}

function normalizeJsonLd(ld, url) {
  const name = ld.name || 'Untitled Recipe';

  // Parse ISO8601 duration (PT20M → "20 min")
  function parseDuration(d) {
    if (!d) return '';
    const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!m) return d;
    const h = parseInt(m[1] || 0);
    const min = parseInt(m[2] || 0);
    if (h && min) return `${h}h ${min} min`;
    if (h) return `${h} hr`;
    return `${min} min`;
  }

  const ingredients = parseIngredients(ld.recipeIngredient || []);
  const steps = parseInstructions(ld.recipeInstructions || []);
  const tags = buildTags(ld);

  return {
    name,
    category: guessCategory(name, tags),
    emoji: guessEmoji(name, tags),
    prep: parseDuration(ld.prepTime),
    bake: parseDuration(ld.cookTime || ld.totalTime),
    servings: parseServings(ld.recipeYield),
    description: stripHtml(ld.description || '').slice(0, 200),
    tags,
    hasVinegar: ingredientsHaveVinegar(ld.recipeIngredient || []),
    ingredients,
    steps,
    sourceUrl: url,
  };
}

// ── Heuristic Fallback ───────────────────────────────────────────────────────

function extractHeuristic($, url) {
  const title = $('h1').first().text().trim() || $('title').text().trim();

  // Ingredients: look for common selectors
  const ingredientSelectors = [
    '.wprm-recipe-ingredient', '.tasty-recipes-ingredients li',
    '.ingredient', '[class*="ingredient"] li', '.recipe-ingredients li',
    '#ingredients li', '.ingredients li'
  ];
  const rawIngredients = [];
  for (const sel of ingredientSelectors) {
    $(sel).each((_, el) => rawIngredients.push($(el).text().trim()));
    if (rawIngredients.length) break;
  }

  // Steps: look for common selectors
  const stepSelectors = [
    '.wprm-recipe-instruction-text', '.tasty-recipes-instructions li',
    '.instruction', '[class*="instruction"] li', '.recipe-instructions li',
    '#instructions li', '.instructions li', '.directions li'
  ];
  const rawSteps = [];
  for (const sel of stepSelectors) {
    $(sel).each((_, el) => rawSteps.push($(el).text().trim()));
    if (rawSteps.length) break;
  }

  const ingredients = parseIngredients(rawIngredients);
  const steps = rawSteps.map((text, i) => ({
    title: `Step ${i + 1}`,
    text,
    tip: null,
    technique: null,
  }));

  return {
    name: title || 'Untitled Recipe',
    category: guessCategory(title, []),
    emoji: guessEmoji(title, []),
    prep: '',
    bake: '',
    servings: 12,
    description: '',
    tags: [],
    hasVinegar: rawIngredients.some(i => /vinegar/i.test(i)),
    ingredients,
    steps,
    sourceUrl: url,
  };
}

// ── Ingredient Parsing ───────────────────────────────────────────────────────

const UNIT_MAP = {
  'cup': 'cup', 'cups': 'cup',
  'tablespoon': 'tbsp', 'tablespoons': 'tbsp', 'tbsp': 'tbsp', 'tbsps': 'tbsp', 'tbs': 'tbsp',
  'teaspoon': 'tsp', 'teaspoons': 'tsp', 'tsp': 'tsp', 'tsps': 'tsp',
  'gram': 'g', 'grams': 'g', 'g': 'g',
  'kilogram': 'kg', 'kilograms': 'kg', 'kg': 'kg',
  'ounce': 'oz', 'ounces': 'oz', 'oz': 'oz',
  'pound': 'lb', 'pounds': 'lb', 'lb': 'lb', 'lbs': 'lb',
  'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
  'l': 'l', 'liter': 'l', 'liters': 'l',
};

const FRACTION_MAP = {
  '½': 0.5, '¼': 0.25, '¾': 0.75,
  '⅓': 0.333, '⅔': 0.667, '⅛': 0.125,
};

function parseSingleIngredient(str, index) {
  // Normalize unicode fractions
  let s = str;
  for (const [f, v] of Object.entries(FRACTION_MAP)) {
    s = s.replace(f, ` ${v}`);
  }

  // Vinegar substitution
  const isVinegar = /vinegar/i.test(s);
  const name = isVinegar
    ? s.replace(/vinegar/gi, 'lemon juice (substituted for vinegar)').trim()
    : s.trim();

  // Try to parse amount + unit
  const match = s.match(/^([\d\s./]+)\s*([a-z]+)?\s+(.+)/i);
  let amount = 0, unit = null, ingName = s;

  if (match) {
    const rawAmt = match[1].trim();
    // Handle "1 1/2" or "1.5" or "0.5"
    amount = rawAmt.split(/\s+/).reduce((acc, part) => {
      if (part.includes('/')) {
        const [n, d] = part.split('/');
        return acc + Number(n) / Number(d);
      }
      return acc + Number(part);
    }, 0);
    const rawUnit = (match[2] || '').toLowerCase();
    unit = UNIT_MAP[rawUnit] || null;
    ingName = unit ? match[3] : s.slice(match[1].length).trim();
  }

  return {
    id: `i${index + 1}`,
    name: ingName.trim(),
    amount: Math.round(amount * 1000) / 1000 || 1,
    unit,
    grams: null,
    isSubstituted: isVinegar,
    originalName: isVinegar ? str.trim() : null,
  };
}

function parseIngredients(list) {
  return list.map((item, i) => parseSingleIngredient(
    typeof item === 'string' ? item : item.text || '',
    i
  ));
}

function ingredientsHaveVinegar(list) {
  return list.some(i => /vinegar/i.test(typeof i === 'string' ? i : i.text || ''));
}

// ── Step Parsing ─────────────────────────────────────────────────────────────

const TECHNIQUE_HINTS = {
  'flaxseed-egg': /flax.*egg|flaxseed egg/i,
  'piping-bag': /piping bag|pipe.*frosting|pipe.*buttercream/i,
  'melting-chocolate': /melt.*chocolate|chocolate.*melt/i,
  'how-to-line-pan': /line.*pan|parchment|grease.*pan/i,
  'vegan-substitutes': /vegan butter|flax egg|plant.*milk|egg replacer/i,
};

function parseInstructions(instructions) {
  const steps = [];
  for (const item of instructions) {
    let text = '';
    if (typeof item === 'string') text = stripHtml(item);
    else if (item['@type'] === 'HowToStep') text = stripHtml(item.text || item.name || '');
    else if (item['@type'] === 'HowToSection') {
      for (const sub of item.itemListElement || []) {
        text = stripHtml(sub.text || sub.name || '');
        steps.push(makeStep(text, steps.length));
      }
      continue;
    }
    if (text) steps.push(makeStep(text, steps.length));
  }
  return steps;
}

function makeStep(text, index) {
  // Detect technique hints
  let technique = null;
  for (const [id, pattern] of Object.entries(TECHNIQUE_HINTS)) {
    if (pattern.test(text)) { technique = id; break; }
  }

  // Extract tip if the text contains "Tip:" or "Note:"
  const tipMatch = text.match(/(?:tip|note)[:\s]+(.+)/i);
  const tip = tipMatch ? tipMatch[1].slice(0, 200) : null;
  const cleanText = tip ? text.replace(tipMatch[0], '').trim() : text;

  return {
    title: cleanText.split(/[.!?]/)[0].slice(0, 60).trim() || `Step ${index + 1}`,
    text: cleanText,
    tip,
    technique,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseServings(raw) {
  if (!raw) return 12;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const m = String(s).match(/\d+/);
  return m ? parseInt(m[0]) : 12;
}

function buildTags(ld) {
  const tags = new Set();
  for (const key of ['keywords', 'recipeCategory', 'recipeCuisine']) {
    if (!ld[key]) continue;
    const val = Array.isArray(ld[key]) ? ld[key] : [ld[key]];
    val.forEach(v => String(v).split(',').forEach(t => tags.add(t.trim().toLowerCase())));
  }
  // Add vegan/eggless tags automatically if relevant
  if (/vegan/i.test(ld.description || '')) tags.add('vegan');
  if (/eggless|egg.free/i.test(ld.description || '')) tags.add('eggless');
  return [...tags].slice(0, 8);
}

function guessCategory(name, tags) {
  const s = (name + ' ' + tags.join(' ')).toLowerCase();
  if (/cupcake/.test(s)) return 'cupcakes';
  if (/cookie|biscuit|brownie|bar/.test(s)) return 'cookies';
  if (/frosting|buttercream|ganache|glaze|icing/.test(s)) return 'frosting';
  if (/cake/.test(s)) return 'cakes';
  return 'other';
}

function guessEmoji(name, tags) {
  const s = (name + ' ' + tags.join(' ')).toLowerCase();
  if (/chocolate/.test(s)) return '🍫';
  if (/vanilla/.test(s)) return '🎂';
  if (/lemon/.test(s)) return '🍋';
  if (/strawberr/.test(s)) return '🍓';
  if (/cookie|biscuit/.test(s)) return '🍪';
  if (/cupcake/.test(s)) return '🧁';
  if (/cake/.test(s)) return '🎂';
  if (/frosting|buttercream/.test(s)) return '🧈';
  return '🍰';
}

module.exports = { extractRecipeWithScraper };
