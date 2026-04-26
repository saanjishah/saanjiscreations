/**
 * default-data.js
 * Source of truth for initial techniques and tips data.
 * Used by the techniques.js and tips.js routes to seed their JSON files
 * the first time the server runs (if no data/techniques.json exists yet).
 */

const TECHNIQUES = [
  {
    id: 'flaxseed-egg',
    icon: '🌾',
    name: 'Flaxseed Egg',
    preview: 'A simple egg substitute that adds binding without any animal products. Perfect for cookies, cakes, and more.',
    steps: [
      'Measure 1 tablespoon of ground flaxseed (not whole seeds — they must be ground).',
      'Add 3 tablespoons of cold water and whisk well with a fork.',
      'Refrigerate for at least 10–15 minutes until the mixture becomes thick and gel-like.',
      'Use immediately in your recipe just as you would use one egg. Works best in dense baked goods like brownies, cookies, and dense cakes.',
      'Note: Flax eggs don\'t provide lift like real eggs — combine with proper leavening agents (baking powder/soda) for best results.',
    ],
    tip: 'Chia seeds also work using the same ratio! Chia eggs are more neutral in flavor.',
    relatedRecipes: ['chocolate-cupcakes'],
  },
  {
    id: 'piping-bag',
    icon: '🎨',
    name: 'How to Use a Piping Bag',
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
    relatedRecipes: ['vegan-buttercream'],
  },
  {
    id: 'melting-chocolate',
    icon: '🍫',
    name: 'Melting Chocolate',
    preview: 'Properly melted chocolate is silky, smooth, and perfect for drips, ganache, and dipping. Avoid the common mistakes.',
    steps: [
      'Use a double boiler: set a heatproof bowl over a pot of barely simmering water. The bowl should NOT touch the water.',
      'Chop chocolate into even pieces for uniform melting. Chips work but bars melt more smoothly.',
      'Stir constantly with a rubber spatula as the chocolate melts. Remove from heat before it\'s completely melted — residual heat finishes the job.',
      'For microwave melting: use 50% power in 20-second increments, stirring between each round.',
      'Critical: keep all water away from melting chocolate. Even a drop can cause the chocolate to "seize" and become grainy.',
      'If chocolate seizes, add 1 teaspoon of warm neutral oil and stir vigorously — it can sometimes be rescued.',
    ],
    tip: 'Add a tablespoon of coconut oil when melting for a glossier, thinner chocolate perfect for drip cakes.',
    relatedRecipes: [],
  },
  {
    id: 'how-to-line-pan',
    icon: '⬛',
    name: 'How to Line a Cake Pan',
    preview: 'Properly lined pans mean cakes release cleanly every time. No more stuck cakes or broken layers.',
    steps: [
      'Trace the bottom of your cake pan onto parchment paper using a pen or pencil.',
      'Cut just inside the line so the circle fits neatly inside the pan.',
      'Grease the sides and bottom of the pan generously with vegan butter or coconut oil.',
      'Place the parchment circle in the bottom of the pan and press flat.',
      'For extra insurance, dust the greased sides with flour and tap out the excess.',
      'Optional: grease the top of the parchment as well for the easiest possible release.',
    ],
    tip: 'Cut parchment strips to line the sides too for tall cakes — especially helpful for cheesecakes and layer cakes with delicate edges.',
    relatedRecipes: ['vanilla-cake'],
  },
  {
    id: 'vegan-substitutes',
    icon: '🌱',
    name: 'Vegan vs Eggless Substitutes',
    preview: 'Understand the difference between vegan and eggless baking, and which substitutes work best for each application.',
    steps: [
      'Vegan = no animal products at all (no eggs, no dairy, no honey). Eggless = no eggs but may include dairy.',
      'Egg substitutes for binding: flax egg (1 tbsp ground flax + 3 tbsp water), chia egg (same ratio), or commercial egg replacer.',
      'Egg substitutes for lift: increase baking powder by ¼ tsp per egg replaced, or add an extra splash of liquid.',
      'Dairy milk → plant-based milk (oat, almond, soy, coconut) in a 1:1 ratio. Soy milk froths best for lighter textures.',
      'Butter → vegan butter (Miyoko\'s or Earth Balance recommended) in a 1:1 ratio. Coconut oil works at 80% the amount.',
      'Buttermilk → plant milk + 1 tablespoon lemon juice per cup. Let sit 5 minutes before using.',
      'Heavy cream → full-fat coconut cream, chilled overnight and whipped.',
    ],
    tip: 'For the most reliable results across all recipes on this site, Miyoko\'s vegan butter and oat milk are Saanji\'s go-to choices.',
    relatedRecipes: ['vanilla-cake', 'chocolate-cupcakes'],
  },
];

const TIPS = [
  { icon: '🍚', title: 'Rice Under Cupcake Liners', text: 'Place a thin layer of uncooked rice in the bottom of each muffin cup before adding the liner. The rice prevents the bottoms of cupcakes from doming or bubbling up, resulting in perfectly flat-bottomed cupcakes that sit evenly on any surface.' },
  { icon: '🌡️', title: 'Room Temperature Ingredients', text: 'Always use room temperature plant milk, vegan butter, and any other cold ingredients unless the recipe specifies otherwise. Cold ingredients don\'t emulsify well and can cause lumpy batters or split frostings.' },
  { icon: '⚖️', title: 'Weigh Your Flour', text: 'A cup of flour can range from 120g to 170g depending on how it\'s scooped. Always spoon flour into the measuring cup and level off, or better yet — use a kitchen scale. Overpacked flour is the #1 reason cakes turn out dense.' },
  { icon: '❄️', title: 'Chill Your Buttercream', text: 'For the cleanest frosting finish, apply a thin crumb coat and refrigerate for 20 minutes before applying the final layer. This locks in crumbs and makes the outer layer smooth and professional.' },
  { icon: '🍋', title: 'Lemon Juice = Vinegar Substitute', text: 'All vinegar in these recipes is automatically substituted with lemon juice in a 1:1 ratio. This works perfectly — the acidity activates baking soda the same way, and the flavor is indistinguishable once baked.' },
  { icon: '🔪', title: 'Hot Knife for Clean Slices', text: 'Dip a long knife in hot water and wipe dry before each slice. The warmth glides through buttercream and ganache without dragging or tearing. Especially useful for layered cakes and drip cakes.' },
  { icon: '📏', title: 'Cake Strips for Even Layers', text: 'Wrap dampened cake strips (or strips of damp old towels) around the outside of your pans before baking. They insulate the edges, ensuring your cake bakes evenly from center to edge without domed tops.' },
  { icon: '🧊', title: 'Freeze for Easy Decorating', text: 'After baking and cooling, wrap cake layers individually and freeze for at least 1 hour (or overnight). Frozen or semi-frozen layers are much easier to level, stack, and frost without crumbling.' },
];

module.exports = { TECHNIQUES, TIPS };
