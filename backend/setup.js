/**
 * setup.js — Seeds the database with initial recipe and creation data.
 * Run once with: node backend/setup.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const UPLOAD_DIRS = [
  path.join(__dirname, '../frontend/public/uploads/recipes'),
  path.join(__dirname, '../frontend/public/uploads/creations'),
];

// Create directories
[DATA_DIR, ...UPLOAD_DIRS].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const RECIPES = [
  {
    id: 'vanilla-cake',
    name: 'Classic Vanilla Cake',
    category: 'cakes',
    emoji: '🎂',
    prep: '25 min',
    bake: '35 min',
    servings: 12,
    tags: ['vegan', 'vanilla', 'classic'],
    description: 'A light, fluffy vanilla cake that forms the perfect base for any occasion. No eggs, no dairy—just pure, delicious flavor.',
    sourceUrl: 'https://minimalistbaker.com',
    hasVinegar: true,
    photo: null,
    ingredients: [
      { id: 'i1', name: 'All-purpose flour', amount: 2, unit: 'cup', grams: 240 },
      { id: 'i2', name: 'Granulated sugar', amount: 1.5, unit: 'cup', grams: 300 },
      { id: 'i3', name: 'Baking soda', amount: 1, unit: 'tsp', grams: 5 },
      { id: 'i4', name: 'Baking powder', amount: 1.5, unit: 'tsp', grams: 6 },
      { id: 'i5', name: 'Salt', amount: 0.5, unit: 'tsp', grams: 3 },
      { id: 'i6', name: 'Oat milk (room temp)', amount: 1, unit: 'cup', grams: 240 },
      { id: 'i7', name: 'Neutral oil (canola or sunflower)', amount: 0.5, unit: 'cup', grams: 110 },
      { id: 'i8', name: 'Vanilla extract', amount: 2, unit: 'tsp', grams: 8 },
      { id: 'i9', name: 'Lemon juice (substituted for apple cider vinegar)', amount: 1, unit: 'tbsp', grams: 15, isSubstituted: true, originalName: 'Apple cider vinegar' },
    ],
    steps: [
      { title: 'Preheat & Prep', text: 'Preheat your oven to 350°F (175°C). Grease two 8-inch round cake pans and line with parchment paper.', technique: 'how-to-line-pan', tip: null },
      { title: 'Mix dry ingredients', text: 'In a large bowl, whisk together flour, sugar, baking soda, baking powder, and salt until evenly combined.', technique: null, tip: null },
      { title: 'Combine wet ingredients', text: 'In a separate bowl, whisk together oat milk, oil, vanilla extract, and lemon juice. Let stand 1 minute — it will slightly curdle, acting as a buttermilk substitute.', technique: null, tip: 'The lemon juice reacts with baking soda for extra lift — do not skip!' },
      { title: 'Make batter', text: 'Pour wet ingredients into dry ingredients and stir gently until just combined. Do not overmix — a few lumps are perfectly fine.', technique: null, tip: null },
      { title: 'Bake', text: 'Divide batter evenly between prepared pans. Bake for 30–35 minutes, until a toothpick inserted in the center comes out clean.', technique: null, tip: null },
      { title: 'Cool', text: 'Let cakes cool in pans for 15 minutes, then turn out onto a wire rack to cool completely before frosting.', technique: null, tip: null },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'chocolate-cupcakes',
    name: 'Fudgy Chocolate Cupcakes',
    category: 'cupcakes',
    emoji: '🧁',
    prep: '20 min',
    bake: '22 min',
    servings: 12,
    tags: ['vegan', 'chocolate', 'fudgy'],
    description: 'Deeply chocolatey, moist, and impossibly fudgy cupcakes. The secret is blooming cocoa in hot coffee.',
    sourceUrl: null,
    hasVinegar: false,
    photo: null,
    ingredients: [
      { id: 'c1', name: 'All-purpose flour', amount: 1, unit: 'cup', grams: 120 },
      { id: 'c2', name: 'Dutch-process cocoa powder', amount: 0.333, unit: 'cup', grams: 30 },
      { id: 'c3', name: 'Granulated sugar', amount: 0.75, unit: 'cup', grams: 150 },
      { id: 'c4', name: 'Baking soda', amount: 1, unit: 'tsp', grams: 5 },
      { id: 'c5', name: 'Salt', amount: 0.25, unit: 'tsp', grams: 1.5 },
      { id: 'c6', name: 'Hot strong coffee', amount: 0.75, unit: 'cup', grams: 180 },
      { id: 'c7', name: 'Neutral oil', amount: 0.25, unit: 'cup', grams: 55 },
      { id: 'c8', name: 'Vanilla extract', amount: 1, unit: 'tsp', grams: 4 },
      { id: 'c9', name: 'Flax egg (2 tbsp ground flax + 6 tbsp water)', amount: 1, unit: null, grams: null, technique: 'flaxseed-egg' },
    ],
    steps: [
      { title: 'Bloom the cocoa', text: 'Pour hot coffee over cocoa powder and whisk until smooth. Let cool to room temperature.', technique: null, tip: null },
      { title: 'Make flax egg', text: 'Whisk ground flaxseed with water and refrigerate 10 minutes until gel-like.', technique: 'flaxseed-egg', tip: 'See the flaxseed egg technique page for full instructions.' },
      { title: 'Preheat & Line', text: 'Preheat oven to 350°F. Line a 12-cup muffin tin with cupcake liners. Place rice under each liner for best results.', technique: null, tip: 'Rice under the liner keeps bottoms flat — see Tips & Tricks!' },
      { title: 'Mix dry ingredients', text: 'In a large bowl, whisk flour, sugar, baking soda, and salt together.', technique: null, tip: null },
      { title: 'Combine everything', text: 'Add the cooled cocoa mixture, oil, vanilla, and flax egg to the dry ingredients. Stir until smooth.', technique: null, tip: null },
      { title: 'Bake', text: 'Fill liners ⅔ full. Bake 20–22 minutes until a toothpick comes out with just a few moist crumbs.', technique: null, tip: null },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'snickerdoodles',
    name: 'Soft Snickerdoodle Cookies',
    category: 'cookies',
    emoji: '🍪',
    prep: '15 min',
    bake: '12 min',
    servings: 24,
    tags: ['eggless', 'cinnamon', 'soft'],
    description: 'Pillowy, cinnamon-sugar cookies with that signature snickerdoodle tang. Egg-free and endlessly snackable.',
    sourceUrl: null,
    hasVinegar: false,
    photo: null,
    ingredients: [
      { id: 's1', name: 'All-purpose flour', amount: 2.75, unit: 'cup', grams: 330 },
      { id: 's2', name: 'Vegan butter (softened)', amount: 1, unit: 'cup', grams: 227 },
      { id: 's3', name: 'Granulated sugar', amount: 1.5, unit: 'cup', grams: 300 },
      { id: 's4', name: 'Almond milk', amount: 3, unit: 'tbsp', grams: 45 },
      { id: 's5', name: 'Vanilla extract', amount: 2, unit: 'tsp', grams: 8 },
      { id: 's6', name: 'Cream of tartar', amount: 2, unit: 'tsp', grams: 6 },
      { id: 's7', name: 'Baking soda', amount: 1, unit: 'tsp', grams: 5 },
      { id: 's8', name: 'Salt', amount: 0.5, unit: 'tsp', grams: 3 },
      { id: 's9', name: 'Cinnamon (for rolling)', amount: 2, unit: 'tsp', grams: 4 },
      { id: 's10', name: 'Sugar (for rolling)', amount: 3, unit: 'tbsp', grams: 36 },
    ],
    steps: [
      { title: 'Cream butter & sugar', text: 'Beat vegan butter and sugar together until light and fluffy, about 3 minutes. Add almond milk and vanilla, mix to combine.', technique: null, tip: null },
      { title: 'Add dry ingredients', text: 'Stir in flour, cream of tartar, baking soda, and salt until a soft dough forms. Chill 30 minutes.', technique: null, tip: null },
      { title: 'Preheat', text: 'Preheat oven to 375°F. Line baking sheets with parchment.', technique: null, tip: null },
      { title: 'Roll & coat', text: 'Mix cinnamon and sugar in a small bowl. Roll dough into 1-inch balls, then roll each in cinnamon sugar.', technique: null, tip: null },
      { title: 'Bake', text: 'Place 2 inches apart on prepared baking sheets. Bake 10–12 minutes — they should look slightly underdone. They firm up as they cool!', technique: null, tip: null },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vegan-buttercream',
    name: 'Fluffy Vegan Buttercream',
    category: 'frosting',
    emoji: '🧈',
    prep: '10 min',
    bake: '0 min',
    servings: 12,
    tags: ['vegan', 'frosting', 'piping'],
    description: 'A stable, fluffy buttercream that pipes beautifully and holds its shape. Perfect for cakes, cupcakes, and decorating.',
    sourceUrl: null,
    hasVinegar: false,
    photo: null,
    ingredients: [
      { id: 'b1', name: 'Vegan butter (cold)', amount: 1, unit: 'cup', grams: 227 },
      { id: 'b2', name: 'Powdered sugar (sifted)', amount: 4, unit: 'cup', grams: 480 },
      { id: 'b3', name: 'Oat milk or coconut cream', amount: 3, unit: 'tbsp', grams: 45 },
      { id: 'b4', name: 'Vanilla extract', amount: 1.5, unit: 'tsp', grams: 6 },
      { id: 'b5', name: 'Salt', amount: 0.25, unit: 'tsp', grams: 1.5 },
    ],
    steps: [
      { title: 'Beat the butter', text: 'Beat cold vegan butter alone for 3–4 minutes until white and creamy. This step is crucial for light, fluffy results.', technique: null, tip: null },
      { title: 'Add sugar gradually', text: 'Add sifted powdered sugar 1 cup at a time, beating on low to start, then increasing to high speed.', technique: null, tip: null },
      { title: 'Add liquid & flavor', text: 'Add oat milk, vanilla, and salt. Beat on high 3–4 minutes until very fluffy and smooth.', technique: null, tip: null },
      { title: 'Adjust consistency', text: 'For stiffer piping: add more powdered sugar. For spreading: add 1 more tbsp oat milk.', technique: 'piping-bag', tip: 'See the piping bag technique for decoration tips.' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const CREATIONS = [
  {
    id: 'cr1', name: 'Ombre Rose Birthday Cake', emoji: '🌹',
    event: 'birthday', date: '2024-03-15',
    base: 'Vanilla Sponge', filling: 'Strawberry Jam + Vanilla Buttercream',
    decorations: 'Pink ombre Swiss meringue buttercream, sugar roses',
    favorite: true, photo: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'cr2', name: 'Chocolate Drip Graduation Cake', emoji: '🎓',
    event: 'graduation', date: '2024-05-20',
    base: 'Fudgy Chocolate Cake', filling: 'Chocolate Ganache',
    decorations: 'Vegan chocolate drip, gold leaf, congratulations topper',
    favorite: false, photo: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'cr3', name: 'Floral Wedding Cupcakes', emoji: '💐',
    event: 'wedding', date: '2024-06-08',
    base: 'Vanilla Cupcakes', filling: 'Lemon Curd',
    decorations: 'White buttercream, piped roses, dried flowers',
    favorite: true, photo: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'cr4', name: 'Holiday Wreath Cookies', emoji: '🎄',
    event: 'holiday', date: '2024-12-20',
    base: 'Sugar Cookies', filling: 'N/A',
    decorations: 'Royal icing, sprinkles, edible gold dust',
    favorite: false, photo: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

// Write to database
fs.writeFileSync(path.join(DATA_DIR, 'recipes.json'), JSON.stringify(RECIPES, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'creations.json'), JSON.stringify(CREATIONS, null, 2));

console.log('✅ Database seeded!');
console.log(`   ${RECIPES.length} recipes → data/recipes.json`);
console.log(`   ${CREATIONS.length} creations → data/creations.json`);
console.log('   Upload folders created at frontend/public/uploads/');
console.log('\nNext steps:');
console.log('  1. cp .env.example .env   (and fill in your values)');
console.log('  2. npm install');
console.log('  3. npm start');
