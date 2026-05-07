// normalizer.js — Grammar, spelling, and ingredient name standardization
// Called on recipe/creation save to clean up scraped or manually-entered content.

const INGREDIENT_MAP = [
  // Regional / alternate flour names
  [/\bmaida\b/gi, 'all-purpose flour'],
  [/\batta\b/gi, 'whole wheat flour'],
  [/\bbesan\b/gi, 'chickpea flour'],
  [/\bcornflour\b/gi, 'cornstarch'],
  [/\bcorn flour\b/gi, 'cornstarch'],
  [/\bself[- ]raising flour\b/gi, 'self-rising flour'],
  [/\bplain flour\b/gi, 'all-purpose flour'],
  [/\bAP flour\b/g, 'all-purpose flour'],

  // Sugar
  [/\bcaster sugar\b/gi, 'superfine sugar'],
  [/\bicing sugar\b/gi, 'powdered sugar'],
  [/\bconfectioners[' ]*sugar\b/gi, 'powdered sugar'],
  [/\bicing sugar\b/gi, 'powdered sugar'],
  [/\bdemerara sugar\b/gi, 'raw cane sugar'],
  [/\bbrown sugar\b/gi, 'light brown sugar'],

  // Dairy / vegan alternatives
  [/\bdouble cream\b/gi, 'heavy cream'],
  [/\bsingle cream\b/gi, 'light cream'],
  [/\bfull[- ]fat coconut milk\b/gi, 'full-fat coconut cream'],
  [/\bcoconut milk \(full[- ]fat\)/gi, 'full-fat coconut cream'],
  [/\bplant milk\b/gi, 'non-dairy milk'],
  [/\bnon-dairy milk\b/gi, 'plant-based milk'],
  [/\boat milk\b/gi, 'oat milk'],

  // Leavening
  [/\bbicarbonate of soda\b/gi, 'baking soda'],
  [/\bbicarb\b/gi, 'baking soda'],
  [/\bbicarbonate\b/gi, 'baking soda'],

  // Fats
  [/\bvegetable shortening\b/gi, 'vegan shortening'],
  [/\bmargarine\b/gi, 'vegan butter'],
  [/\bvegetable oil\b/gi, 'neutral oil'],
  [/\bsunflower oil\b/gi, 'neutral oil'],
  [/\bcanola oil\b/gi, 'neutral oil'],

  // Eggs / egg replacers
  [/\bflax egg\b/gi, 'flax egg'],
  [/\bchia egg\b/gi, 'chia egg'],
  [/\begg replacer\b/gi, 'commercial egg replacer'],

  // Chocolate
  [/\bdark chocolate\b/gi, 'dark chocolate (dairy-free)'],
  [/\bsemi[- ]sweet chocolate\b/gi, 'semi-sweet chocolate (dairy-free)'],

  // Misc
  [/\bvanilla essence\b/gi, 'vanilla extract'],
  [/\bvanilla flavouring\b/gi, 'vanilla extract'],
  [/\bcorn syrup\b/gi, 'light corn syrup'],
  [/\bgolden syrup\b/gi, 'light corn syrup or agave'],
  [/\btreacle\b/gi, 'molasses'],
  [/\bmixed spice\b/gi, 'pumpkin pie spice'],
];

// Common misspellings and grammar fixes
const SPELLING_MAP = [
  [/\breciepe\b/gi, 'recipe'],
  [/\bingredient s\b/gi, 'ingredients'],
  [/\btablespoon s\b/gi, 'tablespoons'],
  [/\bteaspoon s\b/gi, 'teaspoons'],
  [/\buntill\b/gi, 'until'],
  [/\bmixture\s+is\s+is\b/gi, 'mixture is'],
  [/\bpre-heat\b/gi, 'preheat'],
  [/\bpre heat\b/gi, 'preheat'],
  [/\bover night\b/gi, 'overnight'],
  [/\broom-temperature\b/gi, 'room temperature'],
  [/\bhand-full\b/gi, 'handful'],
  [/\bwisk\b/gi, 'whisk'],
  [/\bwhisk\s+together\s+together\b/gi, 'whisk together'],
  [/\bfold in in\b/gi, 'fold in'],
  [/\bstir in in\b/gi, 'stir in'],
  [/\btemp\b/gi, 'temperature'],
  [/\bapprox\b/gi, 'approximately'],
  [/\bapprox\.\b/gi, 'approximately'],
  [/\btbsps\b/gi, 'tablespoons'],
  [/\btsps\b/gi, 'teaspoons'],
];

// Capitalize first letter of a sentence
function capitalizeSentence(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Ensure string ends with a period (for step descriptions)
function ensurePeriod(str) {
  if (!str) return str;
  const trimmed = str.trim();
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return trimmed + '.';
}

/**
 * Normalize an ingredient name.
 * Applies regional substitutions and capitalizes.
 */
function normalizeIngredientName(name) {
  if (!name) return name;
  let result = name.trim();
  for (const [pattern, replacement] of INGREDIENT_MAP) {
    result = result.replace(pattern, replacement);
  }
  return capitalizeSentence(result);
}

/**
 * Normalize a step's text.
 * Fixes spelling, ensures capitalization and punctuation.
 */
function normalizeStepText(text) {
  if (!text) return text;
  let result = text.trim();
  for (const [pattern, replacement] of SPELLING_MAP) {
    result = result.replace(pattern, replacement);
  }
  return ensurePeriod(capitalizeSentence(result));
}

/**
 * Generate a smart step title from the step text.
 * Uses verb-based heuristics rather than just the first N characters.
 */
function generateStepTitle(text) {
  if (!text) return 'Step';

  // Action verb patterns → short title
  const patterns = [
    [/^preheat/i,                          'Preheat Oven'],
    [/^(grease|line|prepare|spray).+pan/i, 'Prepare Pan'],
    [/^(combine|mix|stir|whisk).+dry/i,    'Mix Dry Ingredients'],
    [/^(combine|mix|stir|whisk).+wet/i,    'Combine Wet Ingredients'],
    [/^(mix|stir|whisk|combine|blend)/i,   'Mix Ingredients'],
    [/^(sift)/i,                            'Sift Dry Ingredients'],
    [/^(fold)/i,                            'Fold Together'],
    [/^(pour|transfer|divide)/i,            'Transfer to Pan'],
    [/^(bake|cook|roast)/i,                 'Bake'],
    [/^(cool|let.{0,15}cool|remove.{0,20}oven)/i, 'Cool'],
    [/^(frost|ice|decorate|top)/i,          'Frost & Decorate'],
    [/^(make|prepare|create).+flax/i,       'Make Flax Egg'],
    [/^(make|prepare|create).+ganache/i,    'Make Ganache'],
    [/^(make|prepare|create).+frosting/i,   'Make Frosting'],
    [/^(make|prepare|create).+batter/i,     'Make Batter'],
    [/^(cream|beat).+butter/i,              'Cream Butter & Sugar'],
    [/^(beat|whip)/i,                       'Beat'],
    [/^(add|pour|stir in)/i,                'Add & Combine'],
    [/^(melt)/i,                            'Melt Chocolate'],
    [/^(heat|warm)/i,                       'Heat'],
    [/^(chill|refrigerate|freeze)/i,        'Chill'],
    [/^(serve|slice|cut)/i,                 'Serve'],
    [/^(let|allow|leave).{0,20}rest/i,      'Rest'],
    [/^(let|allow|leave).{0,20}rise/i,      'Rise'],
    [/^(knead)/i,                           'Knead Dough'],
    [/^(roll|flatten|shape)/i,              'Shape Dough'],
    [/^(bloom|activate)/i,                  'Bloom'],
  ];

  const trimmed = text.trim();
  for (const [pattern, title] of patterns) {
    if (pattern.test(trimmed)) return title;
  }

  // Fallback: take up to the first verb phrase — first 4 meaningful words
  const words = trimmed.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
  const titleWords = words.slice(0, Math.min(4, words.length));
  return titleWords.map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()).join(' ');
}

/**
 * Normalize a full recipe object — cleans ingredients and steps.
 * Returns the normalized recipe (does not mutate original).
 */
function normalizeRecipe(recipe) {
  const normalized = { ...recipe };

  if (Array.isArray(recipe.ingredients)) {
    normalized.ingredients = recipe.ingredients.map(ing => ({
      ...ing,
      name: normalizeIngredientName(ing.name),
    }));
  }

  if (Array.isArray(recipe.steps)) {
    normalized.steps = recipe.steps.map(step => {
      const cleanText = normalizeStepText(step.text || '');
      // Always regenerate title from text for scraped recipes (title was auto-generated)
      const smartTitle = generateStepTitle(cleanText);
      return {
        ...step,
        text: cleanText,
        title: smartTitle,
        tip: step.tip ? ensurePeriod(capitalizeSentence(step.tip)) : null,
      };
    });
  }

  // Clean up name and description
  if (recipe.name) normalized.name = capitalizeSentence(recipe.name.trim());
  if (recipe.description) normalized.description = ensurePeriod(capitalizeSentence(recipe.description.trim()));

  return normalized;
}

/**
 * Normalize a creation object.
 */
function normalizeCreation(creation) {
  return {
    ...creation,
    name: creation.name ? capitalizeSentence(creation.name.trim()) : creation.name,
    base: creation.base ? capitalizeSentence(creation.base.trim()) : creation.base,
    filling: creation.filling ? capitalizeSentence(creation.filling.trim()) : creation.filling,
    decorations: creation.decorations ? capitalizeSentence(creation.decorations.trim()) : creation.decorations,
  };
}

// Expose for use in app.js
window.normalizeRecipe = normalizeRecipe;
window.normalizeCreation = normalizeCreation;
window.generateStepTitle = generateStepTitle;
window.normalizeIngredientName = normalizeIngredientName;
