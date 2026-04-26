// data.js — Static data that doesn't require a backend
// Techniques, Tips, and Products are managed here directly.
// Recipes and Creations are loaded from the API (api.js).

const TECHNIQUES = [
  {
    id: 'flaxseed-egg', icon: '🌾', name: 'Flaxseed Egg',
    preview: 'A simple egg substitute that adds binding without any animal products. Perfect for cookies, cakes, and more.',
    steps: [
      'Measure 1 tablespoon of ground flaxseed (not whole seeds — they must be ground).',
      'Add 3 tablespoons of cold water and whisk well with a fork.',
      'Refrigerate for at least 10–15 minutes until the mixture becomes thick and gel-like.',
      'Use immediately in your recipe just as you would use one egg. Works best in dense baked goods like brownies, cookies, and dense cakes.',
      'Note: Flax eggs don\'t provide lift like real eggs — combine with proper leavening agents (baking powder/soda) for best results.',
    ],
    tip: 'Chia seeds also work using the same ratio! Chia eggs are more neutral in flavor.',
    relatedRecipes: ['chocolate-cupcakes']
  },
  {
    id: 'piping-bag', icon: '🎨', name: 'How to Use a Piping Bag',
    preview: 'Master piping and you\'ll transform any cake from homemade to professional-looking. These tips make it easy.',
    steps: [
      'Choose the right tip: large round tips for rosettes, star tips for swirls, petal tips for flowers.',
      'Fit the coupler inside the bag, then press the tip onto the coupler and secure with the ring.',
      'Fold the bag down over your hand by 3–4 inches, then spoon in buttercream — only fill halfway.',
      'Squeeze out any air bubbles from the top and twist the bag closed just above the frosting.',
      'Hold the bag at a 90° angle for rosettes, 45° for swirls. Apply even, consistent pressure.',
      'Practice on parchment paper first! Pipe, scrape back, repeat until you have the motion.',
    ],
    tip: 'Cold buttercream pipes more cleanly. If yours is too soft, refrigerate the filled bag for 10 minutes.',
    relatedRecipes: ['vegan-buttercream']
  },
  {
    id: 'melting-chocolate', icon: '🍫', name: 'Melting Chocolate',
    preview: 'Properly melted chocolate is silky, smooth, and perfect for drips, ganache, and dipping.',
    steps: [
      'Use a double boiler: set a heatproof bowl over a pot of barely simmering water. The bowl should NOT touch the water.',
      'Chop chocolate into even pieces for uniform melting. Chips work but bars melt more smoothly.',
      'Stir constantly with a rubber spatula as the chocolate melts. Remove from heat before completely melted.',
      'For microwave melting: use 50% power in 20-second increments, stirring between each round.',
      'Critical: keep all water away from melting chocolate. Even a drop can cause seizing.',
      'If chocolate seizes, add 1 teaspoon of warm neutral oil and stir vigorously.',
    ],
    tip: 'Add a tablespoon of coconut oil when melting for a glossier chocolate perfect for drip cakes.',
    relatedRecipes: []
  },
  {
    id: 'how-to-line-pan', icon: '⬛', name: 'How to Line a Cake Pan',
    preview: 'Properly lined pans mean cakes release cleanly every time. No more stuck cakes or broken layers.',
    steps: [
      'Trace the bottom of your cake pan onto parchment paper using a pen or pencil.',
      'Cut just inside the line so the circle fits neatly inside the pan.',
      'Grease the sides and bottom of the pan generously with vegan butter or coconut oil.',
      'Place the parchment circle in the bottom of the pan and press flat.',
      'For extra insurance, dust the greased sides with flour and tap out the excess.',
      'Optional: grease the top of the parchment as well for the easiest possible release.',
    ],
    tip: 'Cut parchment strips to line the sides too for tall cakes.',
    relatedRecipes: ['vanilla-cake']
  },
  {
    id: 'vegan-substitutes', icon: '🌱', name: 'Vegan vs Eggless Substitutes',
    preview: 'Understand the difference between vegan and eggless baking, and which substitutes work best for each application.',
    steps: [
      'Vegan = no animal products at all (no eggs, no dairy, no honey). Eggless = no eggs but may include dairy.',
      'Egg substitutes for binding: flax egg (1 tbsp ground flax + 3 tbsp water), chia egg (same ratio), or commercial egg replacer.',
      'Egg substitutes for lift: increase baking powder by ¼ tsp per egg replaced.',
      'Dairy milk → plant-based milk (oat, almond, soy, coconut) 1:1. Soy milk froths best.',
      'Butter → vegan butter (Miyoko\'s or Earth Balance) 1:1. Coconut oil works at 80% the amount.',
      'Buttermilk → plant milk + 1 tablespoon lemon juice per cup. Let sit 5 minutes.',
      'Heavy cream → full-fat coconut cream, chilled overnight and whipped.',
    ],
    tip: 'For the most reliable results, Miyoko\'s vegan butter and oat milk are Saanji\'s go-to choices.',
    relatedRecipes: ['vanilla-cake', 'chocolate-cupcakes']
  }
];

const TIPS = [
  { icon: '🍚', title: 'Rice Under Cupcake Liners', text: 'Place a thin layer of uncooked rice in the bottom of each muffin cup before adding the liner. The rice prevents the bottoms of cupcakes from doming or bubbling up, resulting in perfectly flat-bottomed cupcakes that sit evenly on any surface.' },
  { icon: '🌡️', title: 'Room Temperature Ingredients', text: 'Always use room temperature plant milk, vegan butter, and other cold ingredients unless specified otherwise. Cold ingredients don\'t emulsify well and can cause lumpy batters or split frostings.' },
  { icon: '⚖️', title: 'Weigh Your Flour', text: 'A cup of flour can range from 120g to 170g depending on how it\'s scooped. Always spoon flour into the measuring cup and level off, or better yet — use a kitchen scale.' },
  { icon: '❄️', title: 'Chill Your Buttercream', text: 'For the cleanest frosting finish, apply a thin crumb coat and refrigerate for 20 minutes before applying the final layer. This locks in crumbs and makes the outer layer smooth and professional.' },
  { icon: '🍋', title: 'Lemon Juice = Vinegar Substitute', text: 'All vinegar in these recipes is automatically substituted with lemon juice in a 1:1 ratio. This works perfectly — the acidity activates baking soda the same way, and the flavor is indistinguishable once baked.' },
  { icon: '🔪', title: 'Hot Knife for Clean Slices', text: 'Dip a long knife in hot water and wipe dry before each slice. The warmth glides through buttercream and ganache without dragging or tearing.' },
  { icon: '📏', title: 'Cake Strips for Even Layers', text: 'Wrap dampened cake strips around the outside of your pans before baking. They insulate the edges, ensuring your cake bakes evenly from center to edge without domed tops.' },
  { icon: '🧊', title: 'Freeze for Easy Decorating', text: 'After baking and cooling, wrap cake layers individually and freeze for at least 1 hour. Frozen layers are much easier to level, stack, and frost without crumbling.' },
];

const PRODUCTS = {
  cakes: [
    { name: 'Mini Cake', icon: '🎂', desc: 'Perfect for 1–4 people. 4" round, one layer.', pricing: [{ size: '4" round', serves: '1–4', price: '$35' }] },
    { name: 'Standard Cake', icon: '🎂', desc: 'The classic. Two-layer 6" or 8" round cake.', pricing: [{ size: '6" round', serves: '6–8', price: '$55' }, { size: '8" round', serves: '10–14', price: '$75' }] },
    { name: 'Tiered Cake', icon: '🎂', desc: 'Stunning two-tier showstopper for weddings & events.', pricing: [{ size: '6" + 4"', serves: '15–20', price: '$120' }, { size: '8" + 6"', serves: '25–30', price: '$175' }] },
  ],
  cupcakes: [
    { name: 'Cupcake Dozen', icon: '🧁', desc: 'Classic dozen with your choice of flavor and frosting.', pricing: [{ size: 'Standard (12)', serves: '12', price: '$42' }] },
    { name: 'Cupcake Half-Dozen', icon: '🧁', desc: 'Six cupcakes, perfect for small gatherings.', pricing: [{ size: 'Standard (6)', serves: '6', price: '$24' }] },
    { name: 'Mini Cupcakes', icon: '🧁', desc: 'Bite-size minis, great for parties.', pricing: [{ size: 'Mini (24)', serves: '24', price: '$38' }, { size: 'Mini (48)', serves: '48', price: '$68' }] },
  ],
  cookies: [
    { name: 'Cookie Box', icon: '🍪', desc: 'Mixed or single-flavor cookies, beautifully packaged.', pricing: [{ size: 'Small (12)', serves: '12', price: '$28' }, { size: 'Large (24)', serves: '24', price: '$48' }] },
    { name: 'Decorated Cookies', icon: '🍪', desc: 'Custom-decorated sugar cookies for any occasion.', pricing: [{ size: 'Set of 6', serves: '6', price: '$32' }, { size: 'Set of 12', serves: '12', price: '$58' }] },
  ],
  other: [
    { name: 'Custom Creation', icon: '✨', desc: 'Have a special request? Let\'s design something unique together.', pricing: [{ size: 'Inquire', serves: 'Varies', price: 'Custom quote' }] },
    { name: 'Baking Box', icon: '📦', desc: 'A curated box of assorted baked goods — perfect as a gift.', pricing: [{ size: 'Small', serves: '2–4', price: '$45' }, { size: 'Large', serves: '6–10', price: '$85' }] },
  ]
};

// Static mode: replace arrays with embedded data from api.js
if (window._STATIC_TECHNIQUES_READY && window._STATIC_TECHNIQUES_READY.length) {
  TECHNIQUES.length = 0;
  window._STATIC_TECHNIQUES_READY.forEach(t => TECHNIQUES.push(t));
}
if (window._STATIC_TIPS_READY && window._STATIC_TIPS_READY.length) {
  TIPS.length = 0;
  window._STATIC_TIPS_READY.forEach(t => TIPS.push(t));
}
