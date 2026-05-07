// app.js — Main application logic

// ══ STATE ════════════════════════════════════════════
// Restore admin state from session (survives page re-renders and navigate() calls)
let isAdmin = !!sessionStorage.getItem('admin_token');
let currentPage = 'home';
let currentRecipe = null;
let currentScale = 1;
let useGrams = false;
let autofillMode = 'claude';
let favorites    = JSON.parse(localStorage.getItem('sc_favorites')     || '{}');
let creationFavs = JSON.parse(localStorage.getItem('sc_creation_favs') || '{}');
let notes        = JSON.parse(localStorage.getItem('sc_notes')         || '{}');
let editingRecipeId   = null;
let editingCreationId = null;
let pendingIngredients = [];
let pendingSteps       = [];

// ══ NAVIGATION ═══════════════════════════════════════
function navigate(page, data) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const link = document.querySelector(`[data-page="${page}"]`);
  if (link) link.classList.add('active');
  currentPage = page;
  window.scrollTo(0, 0);
  if (page === 'home')             loadFeatured();
  if (page === 'recipes')          loadRecipes();
  if (page === 'creations')        loadCreations();
  if (page === 'products')         renderProducts('cakes');
  if (page === 'techniques')       renderTechniques();
  if (page === 'tips')             renderTips();
  if (page === 'recipe-detail' && data) loadRecipeDetail(data);
  if (page === 'technique-detail' && data) openTechniqueDetail(data);
}

// ══ MEASUREMENT HELPERS ═══════════════════════════════
const FRACS = { 0.125:'⅛', 0.25:'¼', 0.333:'⅓', 0.5:'½', 0.667:'⅔', 0.75:'¾' };

function formatFrac(n) {
  if (!n && n !== 0) return '0';
  const rounded = Math.round(n * 8) / 8; // round to nearest 1/8
  if (rounded === Math.floor(rounded)) return String(Math.round(rounded));
  const w = Math.floor(rounded);
  const f = rounded - w;
  // find closest fraction key
  const key = Object.keys(FRACS).reduce((a, b) =>
    Math.abs(Number(b) - f) < Math.abs(Number(a) - f) ? b : a
  );
  return w > 0 ? `${w} ${FRACS[key]}` : FRACS[key];
}

function scaleAndConvert(amount, unit, scale) {
  const s = amount * scale;
  if (unit === 'cup') {
    if (s < 0.0625) return { val: Math.round(s * 48 * 4) / 4, unit: 'tsp' };
    if (s < 0.25)   return { val: Math.round(s * 16 * 2) / 2, unit: 'tbsp' };
    return { val: s, unit: 'cup' };
  }
  if (unit === 'tbsp' && s < 1) return { val: Math.round(s * 3 * 4) / 4, unit: 'tsp' };
  return { val: s, unit };
}

function displayIngredient(ing, scale) {
  // Grams mode — use stored gram weight if available
  if (useGrams) {
    if (ing.grams != null) return Math.round(ing.grams * scale) + 'g';
    // No gram data — fall through to standard display with a note
  }
  if (!ing.unit || ing.unit === 'flax egg' || ing.unit === 'chia egg') {
    return formatFrac(ing.amount * scale) + (ing.unit ? ' ' + ing.unit : '');
  }
  const { val, unit } = scaleAndConvert(ing.amount, ing.unit, scale);
  return formatFrac(val) + ' ' + unit;
}

// ══ FEATURED (HOME) ═══════════════════════════════════
async function loadFeatured() {
  // Load favorite creations first
  const creationsEl = document.getElementById('featured-creations');
  if (creationsEl) {
    creationsEl.innerHTML = '<div style="grid-column:1/-1;padding:2rem;text-align:center;color:var(--text-light)">Loading…</div>';
    try {
      const all = await apiGetCreations();
      // Show favorites first, then most recent, up to 3
      const favs   = all.filter(c => creationFavs[c.id] !== undefined ? creationFavs[c.id] : c.favorite);
      const others = all.filter(c => !(creationFavs[c.id] !== undefined ? creationFavs[c.id] : c.favorite));
      const featured = [...favs, ...others].slice(0, 3);
      creationsEl.innerHTML = featured.length
        ? featured.map(c => creationCardHTML(c)).join('')
        : '<div class="empty-state"><div class="empty-title">No creations yet</div></div>';
    } catch {
      creationsEl.innerHTML = '<div class="empty-state"><div class="empty-title">Could not load creations</div></div>';
    }
  }

  // Then load recent recipes
  const recipesEl = document.getElementById('featured-recipes');
  if (recipesEl) {
    recipesEl.innerHTML = '<div style="grid-column:1/-1;padding:2rem;text-align:center;color:var(--text-light)">Loading…</div>';
    try {
      const recipes = await apiGetRecipes();
      const featured = recipes.slice(0, 3);
      recipesEl.innerHTML = featured.length
        ? featured.map(r => recipeCardHTML(r)).join('')
        : '<div class="empty-state"><div class="empty-title">No recipes yet</div></div>';
    } catch {
      recipesEl.innerHTML = '<div class="empty-state"><div class="empty-title">Could not load recipes</div></div>';
    }
  }
}

// ══ RECIPES ══════════════════════════════════════════
let currentRecipeFilter = 'all';

async function loadRecipes(filter) {
  if (filter !== undefined) currentRecipeFilter = filter;
  const el = document.getElementById('all-recipes');
  el.innerHTML = '<div style="grid-column:1/-1;padding:2rem;text-align:center;color:var(--text-light)">Loading…</div>';
  try {
    const params = {};
    if (currentRecipeFilter !== 'all' && currentRecipeFilter !== 'favorites') params.category = currentRecipeFilter;
    let recipes = await apiGetRecipes(params);
    if (currentRecipeFilter === 'favorites') recipes = recipes.filter(r => favorites[r.id]);
    el.innerHTML = recipes.length
      ? recipes.map(r => recipeCardHTML(r)).join('')
      : `<div class="empty-state"><div class="empty-title">No recipes found</div></div>`;
  } catch {
    el.innerHTML = '<div class="empty-state"><div class="empty-title">Could not load recipes</div></div>';
  }
  const adminDiv = document.getElementById('admin-add-recipe');
  adminDiv.style.display = isAdmin ? 'block' : 'none';
  if (isAdmin && !editingRecipeId) renderRecipeForm(null);
}

function filterRecipes(filter, btn) {
  document.querySelectorAll('#page-recipes .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadRecipes(filter);
}

function recipeCardHTML(r) {
  const isFav   = favorites[r.id];
  const hasPhoto = !!r.photo;

  // Badge and fav differ by photo presence
  const badgeHTML   = `<span class="recipe-card-badge">${r.category}</span>`;
  const favHTML     = `<button class="recipe-card-fav" onclick="event.stopPropagation();toggleFav('${r.id}')" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">${isFav ? '♥' : '♡'}</button>`;
  const adminHTML   = isAdmin
    ? `<div class="recipe-card-admin">
        <button class="btn-admin-sm btn-edit" onclick="event.stopPropagation();startEditRecipe('${r.id}')">Edit</button>
        <button class="btn-admin-sm btn-delete" onclick="event.stopPropagation();confirmDeleteRecipe('${r.id}','${r.name.replace(/'/g,"\\'")}')">Delete</button>
       </div>` : '';

  if (hasPhoto) {
    return `<div class="recipe-card" onclick="navigate('recipe-detail','${r.id}')">
      <div class="recipe-card-img">
        <img src="${r.photo}" alt="${r.name}" loading="lazy">
        ${badgeHTML}${favHTML}${adminHTML}
      </div>
      <div class="recipe-card-body">
        <div class="recipe-card-title">${r.name}</div>
        <div class="recipe-card-meta">
          ${r.prep ? `<span>${r.prep} prep</span>` : ''}
          ${r.bake && r.bake !== '0 min' ? `<span>${r.bake} bake</span>` : ''}
          ${r.servings ? `<span>Serves ${r.servings}</span>` : ''}
        </div>
        <div class="recipe-card-tags">${(r.tags||[]).map(t=>`<span class="tag ${t}">${t}</span>`).join('')}</div>
      </div>
    </div>`;
  }

  // No photo — plain list item style
  return `<div class="recipe-card no-photo" onclick="navigate('recipe-detail','${r.id}')">
    <div class="recipe-card-body">
      ${badgeHTML}
      <div class="recipe-card-title">${r.name}</div>
      <div class="recipe-card-meta">
        ${r.prep ? `<span>${r.prep} prep</span>` : ''}
        ${r.bake && r.bake !== '0 min' ? `<span>${r.bake} bake</span>` : ''}
        ${r.servings ? `<span>Serves ${r.servings}</span>` : ''}
      </div>
      <div class="recipe-card-tags">${(r.tags||[]).map(t=>`<span class="tag ${t}">${t}</span>`).join('')}</div>
      <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.35rem">
        ${favHTML}
        ${adminHTML}
      </div>
    </div>
  </div>`;
}

function toggleFav(id) {
  favorites[id] = !favorites[id];
  localStorage.setItem('sc_favorites', JSON.stringify(favorites));
  loadFeatured();
  if (currentPage === 'recipes') loadRecipes();
  showToast(favorites[id] ? 'Added to favorites' : 'Removed from favorites');
}

// ══ RECIPE DETAIL ════════════════════════════════════
async function loadRecipeDetail(id) {
  const container = document.getElementById('recipe-detail-content');
  container.innerHTML = '<div style="text-align:center;padding:4rem;color:var(--text-light)">Loading…</div>';
  try {
    const recipe = await apiGetRecipe(id);
    currentRecipe = recipe;
    currentScale  = 1;
    useGrams      = false;
    renderRecipeDetail(recipe);
  } catch {
    container.innerHTML = '<div class="empty-state"><div class="empty-title">Could not load recipe</div></div>';
  }
}

function renderRecipeDetail(recipe) {
  const isFav    = favorites[recipe.id];
  const adminBtns = isAdmin
    ? `<button class="btn-admin-sm btn-edit" onclick="startEditRecipe('${recipe.id}')">Edit Recipe</button>
       <button class="btn-admin-sm btn-delete" onclick="confirmDeleteRecipe('${recipe.id}','${recipe.name.replace(/'/g,"\\'")}')">Delete</button>`
    : '';

  document.getElementById('recipe-detail-content').innerHTML = `
  <div class="page-breadcrumb">
    <a onclick="navigate('recipes')">Recipes</a><span>/</span>
    <span class="current">${recipe.name}</span>
  </div>
  <div class="recipe-detail">
    <button class="recipe-back" onclick="navigate('recipes')">← Back to Recipes</button>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:0.25rem">
      <h1 class="recipe-detail-title">${recipe.name}</h1>
      ${isAdmin ? `<div style="display:flex;gap:0.5rem;flex-wrap:wrap;padding-top:0.5rem">${adminBtns}</div>` : ''}
    </div>
    ${recipe.photo ? `<img src="${recipe.photo}" alt="${recipe.name}" style="width:100%;max-height:340px;object-fit:cover;border-radius:var(--radius-lg);margin:0.9rem 0 1.1rem">` : ''}
    ${recipe.description ? `<p style="font-size:0.9rem;color:var(--text-secondary);margin:0.65rem 0 1.1rem;line-height:1.72">${recipe.description}</p>` : ''}
    ${recipe.hasVinegar ? `<div class="vinegar-notice">All vinegar substituted with lemon juice (1:1)</div>` : ''}
    <div class="recipe-detail-meta">
      ${recipe.prep ? `<span>Prep: <strong>${recipe.prep}</strong></span>` : ''}
      ${recipe.bake && recipe.bake !== '0 min' ? `<span>Bake: <strong>${recipe.bake}</strong></span>` : ''}
      <span>Serves: <strong id="serves-display">${recipe.servings}</strong></span>
      ${recipe.sourceUrl ? `<span><a href="${recipe.sourceUrl}" target="_blank" rel="noopener" style="color:var(--rose);font-size:0.78rem">View original recipe ↗</a></span>` : ''}
    </div>
    <div class="recipe-actions">
      <div class="scale-control">
        <span class="scale-label">Scale</span>
        ${[0.25,0.5,1,1.5,2].map(s =>
          `<button class="scale-btn${s===1?' active':''}" onclick="setScale(${s},this)">${s===0.25?'¼×':s===0.5?'½×':s===1?'1×':s===1.5?'1½×':'2×'}</button>`
        ).join('')}
      </div>
      <div class="unit-toggle">
        <button class="unit-btn active" id="btn-standard" onclick="setUnit('standard')">Standard</button>
        <button class="unit-btn" id="btn-grams" onclick="setUnit('grams')">Grams</button>
      </div>
      <button class="share-btn" id="detail-fav-btn" onclick="toggleFav('${recipe.id}')">${isFav ? '♥ Favorited' : '♡ Favorite'}</button>
      <div style="position:relative">
        <button class="share-btn" onclick="toggleShareDropdown(event)">Share ↗</button>
        <div id="share-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 7px);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:0.45rem;box-shadow:var(--shadow-lg);z-index:50;min-width:205px">
          <button class="share-option" onclick="shareRecipe('recipe-only')">Recipe only</button>
          <button class="share-option" onclick="shareRecipe('result-only')">Result photo + recipe</button>
          <button class="share-option" onclick="shareRecipe('pdf')">Download PDF</button>
          <button class="share-option" onclick="shareRecipe('link')">Copy link</button>
        </div>
      </div>
    </div>
    <div class="recipe-layout">
      <div class="ingredients-panel">
        <div class="panel-title">Ingredients</div>
        <div id="ingredients-list"></div>
      </div>
      <div>
        <div class="panel-title" style="margin-bottom:1.4rem">Method</div>
        <div id="steps-list"></div>
        <div class="notes-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.65rem">
            <span style="font-size:0.68rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted)">My Notes</span>
            <span style="font-size:0.7rem;color:var(--text-light)">Auto-saved</span>
          </div>
          <textarea class="notes-textarea" id="recipe-notes" placeholder="Add your notes, modifications, or reminders here…" oninput="saveNote('${recipe.id}',this.value)">${notes[recipe.id]||''}</textarea>
        </div>
      </div>
    </div>
  </div>`;

  renderIngredients(recipe, 1);
  renderSteps(recipe);
}

function renderIngredients(recipe, scale) {
  const el = document.getElementById('ingredients-list');
  if (!el || !recipe.ingredients) return;

  // Check if any ingredient has grams data — if none do, hide grams toggle
  const hasAnyGrams = recipe.ingredients.some(i => i.grams != null);
  const gramsBtn = document.getElementById('btn-grams');
  if (gramsBtn) {
    gramsBtn.disabled = !hasAnyGrams;
    gramsBtn.title    = hasAnyGrams ? '' : 'No gram weights available for this recipe';
    gramsBtn.style.opacity = hasAnyGrams ? '1' : '0.4';
    gramsBtn.style.cursor  = hasAnyGrams ? 'pointer' : 'not-allowed';
  }

  el.innerHTML = (recipe.ingredients).map(ing => {
    const amt = displayIngredient(ing, scale);
    const nameHtml = ing.isSubstituted
      ? `<span style="color:var(--sage)">${ing.name}</span><span class="ingredient-note">substituted for ${ing.originalName} (1:1)</span>`
      : ing.name;
    const techLink = ing.technique
      ? `<button class="step-technique-link" onclick="navigate('technique-detail','${ing.technique}')">See technique</button>`
      : '';
    // Show "no gram data" hint in grams mode
    const gramsHint = (useGrams && ing.grams == null && ing.unit)
      ? `<span class="ingredient-note">gram weight unavailable</span>` : '';
    return `<div class="ingredient-item">
      <div class="ingredient-amount">${amt}</div>
      <div class="ingredient-name">${nameHtml}${gramsHint}${techLink}</div>
    </div>`;
  }).join('');

  const sd = document.getElementById('serves-display');
  if (sd) sd.textContent = Math.round(recipe.servings * scale);
}

function renderSteps(recipe) {
  const el = document.getElementById('steps-list');
  if (!el || !recipe.steps) return;
  el.innerHTML = (recipe.steps).map((step, i) => {
    const tech = step.technique ? TECHNIQUES.find(t => t.id === step.technique) : null;
    const techLink = tech
      ? `<button class="step-technique-link" onclick="navigate('technique-detail','${tech.id}')">See technique: ${tech.name}</button>`
      : '';
    const tip = step.tip
      ? `<div class="step-tip"><strong>Tip:</strong> ${step.tip}</div>`
      : '';
    return `<div class="step-item">
      <div class="step-number">${i + 1}</div>
      <div class="step-content">
        <div class="step-title">${step.title}</div>
        <div class="step-text">${step.text}</div>
        ${techLink}${tip}
      </div>
    </div>`;
  }).join('');
}

function setScale(scale, btn) {
  currentScale = scale;
  document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (currentRecipe) renderIngredients(currentRecipe, scale);
}

function setUnit(unit) {
  useGrams = unit === 'grams';
  const stdBtn   = document.getElementById('btn-standard');
  const gramsBtn = document.getElementById('btn-grams');
  if (stdBtn)   stdBtn.classList.toggle('active', !useGrams);
  if (gramsBtn) gramsBtn.classList.toggle('active', useGrams);
  if (currentRecipe) renderIngredients(currentRecipe, currentScale);
}

function saveNote(id, text) {
  notes[id] = text;
  localStorage.setItem('sc_notes', JSON.stringify(notes));
}

function toggleShareDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('share-dropdown');
  if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function shareRecipe(type) {
  const dd = document.getElementById('share-dropdown');
  if (dd) dd.style.display = 'none';
  if (type === 'link' && currentRecipe) {
    const base = (window._SITE_URL || (location.href.split('?')[0].replace(/#.*$/, ''))).replace(/\/$/, '');
    const url  = `${base}/?recipe=${currentRecipe.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast('Link copied to clipboard');
    return;
  }
  if (type === 'pdf') { window.print(); return; }
  showToast('Shared');
}

document.addEventListener('click', () => {
  const dd = document.getElementById('share-dropdown');
  if (dd) dd.style.display = 'none';
});

// ══ RECIPE FORM ═══════════════════════════════════════
function renderRecipeForm(prefill) {
  const isEdit = !!editingRecipeId;
  const r = prefill || {};
  const existingIngCount  = (r.ingredients || []).length;
  const existingStepCount = (r.steps || []).length;

  document.getElementById('recipe-form-container').innerHTML = `
  <div class="admin-panel">
    <h3 class="admin-title">${isEdit ? 'Edit Recipe' : 'Add New Recipe'}</h3>
    ${!isEdit ? `
    <div class="scraper-toggle">
      <span class="scraper-toggle-label">Autofill mode</span>
      <button class="scraper-mode-btn ${autofillMode==='claude'?'active':''}" onclick="setAutofillMode('claude',this)">Claude AI</button>
      <button class="scraper-mode-btn ${autofillMode==='scraper'?'active':''}" onclick="setAutofillMode('scraper',this)">Web Scraper</button>
    </div>
    <div class="form-group">
      <label class="form-label">Recipe URL — paste to autofill ingredients &amp; steps</label>
      <div style="display:flex;gap:0.7rem">
        <input class="form-input" id="recipe-url-input" placeholder="https://..." style="flex:1">
        <button class="btn-admin-big" id="autofill-btn" onclick="runAutofill()">
          <span id="af-spinner"></span><span id="af-label">Autofill</span>
        </button>
      </div>
      <div id="af-summary" style="display:none;margin-top:0.45rem;font-size:0.78rem;color:var(--sage);font-weight:500;padding:0.38rem 0.7rem;background:rgba(122,148,120,0.1);border-radius:8px;border:1px solid rgba(122,148,120,0.22)"></div>
    </div>` : `
    <div style="margin-bottom:1.1rem;padding:0.7rem 0.9rem;background:rgba(122,148,120,0.07);border:1px solid rgba(122,148,120,0.18);border-radius:9px;font-size:0.8rem;color:var(--text-muted)">
      Existing content: <strong>${existingIngCount} ingredients</strong> and <strong>${existingStepCount} steps</strong> will be preserved unless you autofill a new URL.
    </div>`}
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Recipe Name *</label>
        <input class="form-input" id="rf-name" placeholder="e.g. Chocolate Lava Cake" value="${r.name||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="rf-category">
          ${['cakes','cupcakes','cookies','frosting','other'].map(c =>
            `<option value="${c}" ${r.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`
          ).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Prep Time</label>
        <input class="form-input" id="rf-prep" placeholder="20 min" value="${r.prep||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Bake Time</label>
        <input class="form-input" id="rf-bake" placeholder="35 min" value="${r.bake||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Servings</label>
        <input class="form-input" id="rf-servings" type="number" placeholder="12" value="${r.servings||12}">
      </div>
      <div class="form-group">
        <label class="form-label">Tags (comma separated)</label>
        <input class="form-input" id="rf-tags" placeholder="vegan, chocolate, easy" value="${(r.tags||[]).join(', ')}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="rf-description" placeholder="A short description of this recipe…">${r.description||''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Source URL</label>
      <input class="form-input" id="rf-source" placeholder="https://..." value="${r.sourceUrl||''}">
    </div>
    <div class="form-group">
      <label class="form-label">Photo ${r.photo ? '— current photo saved, upload to replace' : ''}</label>
      ${r.photo ? `<div style="margin-bottom:0.65rem"><img src="${r.photo}" style="height:90px;border-radius:8px;object-fit:cover"></div>` : ''}
      <div class="upload-zone" onclick="document.getElementById('rf-photo').click()">
        <div style="font-size:1.4rem;margin-bottom:0.3rem">↑</div>
        <div id="rf-photo-label">Click to upload photo</div>
        <input type="file" id="rf-photo" accept="image/*" style="display:none" onchange="previewPhoto(this,'rf-photo-label','rf-photo-preview')">
      </div>
      <img id="rf-photo-preview" style="display:none;margin-top:0.65rem;height:110px;border-radius:8px;object-fit:cover">
    </div>
    <div style="display:flex;gap:0.7rem;margin-top:0.6rem;flex-wrap:wrap">
      <button class="btn-primary" onclick="${isEdit?'saveEditRecipe()':'saveNewRecipe()'}" id="recipe-save-btn">
        ${isEdit ? 'Save Changes' : 'Add Recipe'}
      </button>
      ${isEdit ? '<button class="btn-outline" onclick="cancelEditRecipe()">Cancel</button>' : ''}
    </div>
  </div>`;
}

function setAutofillMode(mode, btn) {
  autofillMode = mode;
  document.querySelectorAll('.scraper-mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  showToast(`Autofill: ${mode === 'claude' ? 'Claude AI' : 'Web Scraper'}`);
}

async function runAutofill() {
  const url = document.getElementById('recipe-url-input')?.value.trim();
  if (!url) { showToast('Please enter a URL first.'); return; }
  const btn     = document.getElementById('autofill-btn');
  const spinner = document.getElementById('af-spinner');
  const label   = document.getElementById('af-label');
  btn.disabled  = true;
  spinner.innerHTML = '<span class="loading-spinner"></span>';
  label.textContent = 'Fetching…';
  try {
    const result = await apiAutofill(url, autofillMode);
    if (result.error) throw new Error(result.error);

    // Run normalizer on the scraped data
    const normalized = window.normalizeRecipe ? window.normalizeRecipe(result.data) : result.data;
    const d = normalized;

    if (d.name)        document.getElementById('rf-name').value = d.name;
    if (d.category)    document.getElementById('rf-category').value = d.category;
    if (d.prep)        document.getElementById('rf-prep').value = d.prep;
    if (d.bake)        document.getElementById('rf-bake').value = d.bake;
    if (d.servings)    document.getElementById('rf-servings').value = d.servings;
    if (d.tags)        document.getElementById('rf-tags').value = Array.isArray(d.tags) ? d.tags.join(', ') : d.tags;
    if (d.description) document.getElementById('rf-description').value = d.description;

    pendingIngredients = Array.isArray(d.ingredients) ? d.ingredients : [];
    pendingSteps       = Array.isArray(d.steps)       ? d.steps       : [];

    const summaryEl = document.getElementById('af-summary');
    if (summaryEl) {
      summaryEl.textContent = `${pendingIngredients.length} ingredients and ${pendingSteps.length} steps loaded via ${d._extractedBy || autofillMode}`;
      summaryEl.style.display = 'block';
    }
    showToast(`Autofilled — ${pendingIngredients.length} ingredients, ${pendingSteps.length} steps`);
  } catch (err) {
    showToast('Autofill failed: ' + err.message);
  } finally {
    btn.disabled = false;
    spinner.innerHTML = '';
    label.textContent = 'Autofill';
  }
}

function collectRecipeFormData() {
  const name = document.getElementById('rf-name').value.trim();
  if (!name) { showToast('Recipe name is required.'); return null; }

  const ingredients = pendingIngredients.length > 0
    ? pendingIngredients
    : (editingRecipeId && currentRecipe?.ingredients ? currentRecipe.ingredients : []);
  const steps = pendingSteps.length > 0
    ? pendingSteps
    : (editingRecipeId && currentRecipe?.steps ? currentRecipe.steps : []);

  const hasVinegar = ingredients.some(i => i.isSubstituted) ||
    /vinegar/i.test(document.getElementById('rf-description')?.value || '');

  const rawData = {
    name,
    category:    document.getElementById('rf-category').value,
    prep:        document.getElementById('rf-prep').value.trim(),
    bake:        document.getElementById('rf-bake').value.trim(),
    servings:    document.getElementById('rf-servings').value,
    tags:        document.getElementById('rf-tags').value.split(',').map(s=>s.trim()).filter(Boolean),
    description: document.getElementById('rf-description').value.trim(),
    sourceUrl:   document.getElementById('rf-source')?.value.trim() || '',
    hasVinegar,
    ingredients,
    steps,
  };

  // Run normalizer on manually entered data too
  const data = window.normalizeRecipe ? window.normalizeRecipe(rawData) : rawData;

  const fd = new FormData();
  fd.append('data', JSON.stringify(data));
  const photo = document.getElementById('rf-photo')?.files[0];
  if (photo) fd.append('photo', photo);
  return fd;
}

async function saveNewRecipe() {
  const fd = collectRecipeFormData();
  if (!fd) return;
  const btn = document.getElementById('recipe-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const result = await apiCreateRecipe(fd);
    if (result.error) throw new Error(result.error);
    showToast(`"${result.name}" added`);
    editingRecipeId    = null;
    pendingIngredients = [];
    pendingSteps       = [];
    await loadRecipes();
    window.scrollTo(0, 0);
  } catch (err) {
    showToast('Error: ' + err.message);
    btn.disabled = false; btn.textContent = 'Add Recipe';
  }
}

async function startEditRecipe(id) {
  editingRecipeId    = id;
  pendingIngredients = [];
  pendingSteps       = [];
  navigate('recipes');
  setTimeout(async () => {
    const recipe = await apiGetRecipe(id).catch(() => null);
    if (!recipe) return;
    currentRecipe = recipe;
    renderRecipeForm(recipe);
    document.getElementById('admin-add-recipe').style.display = 'block';
    document.getElementById('recipe-form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

async function saveEditRecipe() {
  const fd = collectRecipeFormData();
  if (!fd) return;
  const btn = document.getElementById('recipe-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const result = await apiUpdateRecipe(editingRecipeId, fd);
    if (result.error) throw new Error(result.error);
    showToast(`"${result.name}" updated`);
    editingRecipeId    = null;
    pendingIngredients = [];
    pendingSteps       = [];
    await loadRecipes();
    window.scrollTo(0, 0);
  } catch (err) {
    showToast('Error: ' + err.message);
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

function cancelEditRecipe() {
  editingRecipeId    = null;
  pendingIngredients = [];
  pendingSteps       = [];
  renderRecipeForm(null);
}

function confirmDeleteRecipe(id, name) {
  document.getElementById('confirm-message').textContent =
    `Are you sure you want to delete "${name}"? This cannot be undone.`;
  document.getElementById('confirm-yes').onclick = async () => {
    closeModal('confirm-modal');
    try {
      await apiDeleteRecipe(id);
      showToast(`"${name}" deleted`);
      if (currentPage === 'recipe-detail') navigate('recipes');
      else await loadRecipes();
    } catch { showToast('Delete failed.'); }
  };
  document.getElementById('confirm-modal').style.display = 'flex';
}

// ══ CREATIONS ════════════════════════════════════════
let currentCreationFilter = 'all';

async function loadCreations(filter) {
  if (filter !== undefined) currentCreationFilter = filter;
  const el = document.getElementById('creations-gallery');
  el.innerHTML = '<div style="grid-column:1/-1;padding:2rem;text-align:center;color:var(--text-light)">Loading…</div>';
  try {
    const params = {};
    if (currentCreationFilter !== 'all' && currentCreationFilter !== 'favorites') params.event = currentCreationFilter;
    let creations = await apiGetCreations(params);
    if (currentCreationFilter === 'favorites')
      creations = creations.filter(c => creationFavs[c.id] !== undefined ? creationFavs[c.id] : c.favorite);
    el.innerHTML = creations.length
      ? creations.map(c => creationCardHTML(c)).join('')
      : `<div class="empty-state"><div class="empty-title">Nothing here yet</div></div>`;
  } catch {
    el.innerHTML = '<div class="empty-state"><div class="empty-title">Could not load creations</div></div>';
  }
  const adminDiv = document.getElementById('admin-add-creation');
  adminDiv.style.display = isAdmin ? 'block' : 'none';
  if (isAdmin && !editingCreationId) renderCreationForm(null);
}

function filterCreations(filter, btn) {
  document.querySelectorAll('#page-creations .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadCreations(filter);
}

function creationCardHTML(c) {
  const isFav    = creationFavs[c.id] !== undefined ? creationFavs[c.id] : c.favorite;
  const hasPhoto = !!c.photo;
  const dateStr  = c.date
    ? new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';
  const eventLabel = { birthday:'Birthday', wedding:'Wedding', graduation:'Graduation', holiday:'Holiday', other:'Other' }[c.event] || c.event;
  const favHTML   = `<button class="gallery-fav" onclick="event.stopPropagation();toggleCreationFav('${c.id}')" title="${isFav?'Remove from favorites':'Add to favorites'}">${isFav?'♥':'♡'}</button>`;
  const adminHTML = isAdmin
    ? `<div class="gallery-admin">
        <button class="btn-admin-sm btn-edit" onclick="event.stopPropagation();startEditCreation('${c.id}')">Edit</button>
        <button class="btn-admin-sm btn-delete" onclick="event.stopPropagation();confirmDeleteCreation('${c.id}','${c.name.replace(/'/g,"\\'")}')">Delete</button>
       </div>` : '';

  const bodyHTML = `
    <div class="gallery-body">
      <div class="gallery-title">${c.name}</div>
      <div class="gallery-meta">${eventLabel}${dateStr ? ' · ' + dateStr : ''}</div>
      <div class="gallery-layers">
        ${c.base         ? `<div class="gallery-layer"><span class="gallery-layer-label">Base</span>${c.base}</div>` : ''}
        ${c.filling      ? `<div class="gallery-layer"><span class="gallery-layer-label">Filling</span>${c.filling}</div>` : ''}
        ${c.decorations  ? `<div class="gallery-layer"><span class="gallery-layer-label">Decor</span>${c.decorations}</div>` : ''}
      </div>
      ${!hasPhoto ? `<div style="display:flex;align-items:center;gap:0.45rem;margin-top:0.45rem">${favHTML}${adminHTML}</div>` : ''}
    </div>`;

  if (hasPhoto) {
    return `<div class="gallery-card">
      <div class="gallery-img">
        <img src="${c.photo}" alt="${c.name}" loading="lazy">
        ${favHTML}${adminHTML}
      </div>
      ${bodyHTML}
    </div>`;
  }

  return `<div class="gallery-card no-photo">
    ${bodyHTML}
  </div>`;
}

function toggleCreationFav(id) {
  const current = creationFavs[id] !== undefined ? creationFavs[id] : false;
  creationFavs[id] = !current;
  localStorage.setItem('sc_creation_favs', JSON.stringify(creationFavs));
  const fd = new FormData();
  fd.append('data', JSON.stringify({ favorite: creationFavs[id] }));
  apiUpdateCreation(id, fd).catch(() => {});
  loadCreations();
  showToast(creationFavs[id] ? 'Added to favorites' : 'Removed from favorites');
}

// ══ CREATION FORM ═════════════════════════════════════
function renderCreationForm(prefill) {
  const isEdit = !!editingCreationId;
  const c = prefill || {};
  document.getElementById('creation-form-container').innerHTML = `
  <div class="admin-panel">
    <h3 class="admin-title">${isEdit ? 'Edit Creation' : 'Add Creation'}</h3>
    <div class="form-group">
      <label class="form-label">Photo ${c.photo ? '— current saved, upload to replace' : ''}</label>
      ${c.photo ? `<div style="margin-bottom:0.65rem"><img src="${c.photo}" style="height:90px;border-radius:8px;object-fit:cover"></div>` : ''}
      <div class="upload-zone" onclick="document.getElementById('cf-photo').click()">
        <div style="font-size:1.4rem;margin-bottom:0.3rem">↑</div>
        <div id="cf-photo-label">Click to upload photo</div>
        <input type="file" id="cf-photo" accept="image/*" style="display:none" onchange="previewPhoto(this,'cf-photo-label','cf-photo-preview')">
      </div>
      <img id="cf-photo-preview" style="display:none;margin-top:0.65rem;height:110px;border-radius:8px;object-fit:cover">
    </div>
    <div class="form-group">
      <label class="form-label">Creation Name *</label>
      <input class="form-input" id="cf-name" placeholder="e.g. Rose Vanilla Birthday Cake" value="${c.name||''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Event Category</label>
        <select class="form-select" id="cf-event">
          ${['birthday','wedding','graduation','holiday','other'].map(e =>
            `<option value="${e}" ${c.event===e?'selected':''}>${e.charAt(0).toUpperCase()+e.slice(1)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" type="date" id="cf-date" value="${c.date||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Base / Cake Flavor</label>
      <input class="form-input" id="cf-base" placeholder="e.g. Vanilla Sponge" value="${c.base||''}">
    </div>
    <div class="form-group">
      <label class="form-label">Filling</label>
      <input class="form-input" id="cf-filling" placeholder="e.g. Raspberry Jam and Buttercream" value="${c.filling||''}">
    </div>
    <div class="form-group">
      <label class="form-label">Decorations / Frosting / Toppings</label>
      <input class="form-input" id="cf-decorations" placeholder="e.g. Swiss Meringue Buttercream, fresh roses" value="${c.decorations||''}">
    </div>
    <div style="display:flex;gap:0.7rem;margin-top:0.6rem;flex-wrap:wrap">
      <button class="btn-primary" onclick="${isEdit?'saveEditCreation()':'saveNewCreation()'}" id="creation-save-btn">
        ${isEdit ? 'Save Changes' : 'Add Creation'}
      </button>
      ${isEdit ? '<button class="btn-outline" onclick="cancelEditCreation()">Cancel</button>' : ''}
    </div>
  </div>`;
}

function collectCreationFormData() {
  const name = document.getElementById('cf-name').value.trim();
  if (!name) { showToast('Creation name is required.'); return null; }
  const rawData = {
    name,
    event:       document.getElementById('cf-event').value,
    date:        document.getElementById('cf-date').value || new Date().toISOString().split('T')[0],
    base:        document.getElementById('cf-base').value.trim(),
    filling:     document.getElementById('cf-filling').value.trim(),
    decorations: document.getElementById('cf-decorations').value.trim(),
  };
  const data = window.normalizeCreation ? window.normalizeCreation(rawData) : rawData;
  const fd = new FormData();
  fd.append('data', JSON.stringify(data));
  const photo = document.getElementById('cf-photo')?.files[0];
  if (photo) fd.append('photo', photo);
  return fd;
}

async function saveNewCreation() {
  const fd = collectCreationFormData();
  if (!fd) return;
  const btn = document.getElementById('creation-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const result = await apiCreateCreation(fd);
    if (result.error) throw new Error(result.error);
    showToast(`"${result.name}" added`);
    editingCreationId = null;
    await loadCreations();
    window.scrollTo(0, 0);
  } catch (err) {
    showToast('Error: ' + err.message);
    btn.disabled = false; btn.textContent = 'Add Creation';
  }
}

async function startEditCreation(id) {
  editingCreationId = id;
  navigate('creations');
  setTimeout(async () => {
    const res = await fetch(`/api/creations/${id}`, { headers: getAuthHeaders() }).then(r => r.json()).catch(() => null);
    if (!res) return;
    renderCreationForm(res);
    document.getElementById('admin-add-creation').style.display = 'block';
    document.getElementById('creation-form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

async function saveEditCreation() {
  const fd = collectCreationFormData();
  if (!fd) return;
  const btn = document.getElementById('creation-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const result = await apiUpdateCreation(editingCreationId, fd);
    if (result.error) throw new Error(result.error);
    showToast(`"${result.name}" updated`);
    editingCreationId = null;
    await loadCreations();
    window.scrollTo(0, 0);
  } catch (err) {
    showToast('Error: ' + err.message);
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

function cancelEditCreation() {
  editingCreationId = null;
  renderCreationForm(null);
}

function confirmDeleteCreation(id, name) {
  document.getElementById('confirm-message').textContent =
    `Are you sure you want to delete "${name}"? This cannot be undone.`;
  document.getElementById('confirm-yes').onclick = async () => {
    closeModal('confirm-modal');
    try {
      await apiDeleteCreation(id);
      showToast(`"${name}" deleted`);
      await loadCreations();
    } catch { showToast('Delete failed.'); }
  };
  document.getElementById('confirm-modal').style.display = 'flex';
}

// ══ PHOTO PREVIEW ═════════════════════════════════════
function previewPhoto(input, labelId, previewId) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById(labelId).textContent = file.name;
  const preview = document.getElementById(previewId);
  if (preview) {
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
    reader.readAsDataURL(file);
  }
}

// ══ PRODUCTS ══════════════════════════════════════════
function renderProducts(category) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = (PRODUCTS[category]||[]).map(p => `
    <div class="product-card">
      <div class="product-name">${p.name}</div>
      <div class="product-desc">${p.desc}</div>
      <div class="product-pricing">
        ${p.pricing.map(pr =>
          `<div class="price-row"><span>${pr.size} · serves ${pr.serves}</span><span class="price-amount">${pr.price}</span></div>`
        ).join('')}
      </div>
      <button class="btn-primary" style="margin-top:0.7rem;font-size:0.74rem"
        onclick="showToast('Order inquiry noted — Saanji will be in touch.')">Inquire to Order</button>
    </div>`).join('');
}

function switchProductTab(cat, btn) {
  document.querySelectorAll('.product-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderProducts(cat);
}

// ══ TECHNIQUES ════════════════════════════════════════
let editingTechniqueId = null;

async function loadTechniquesFromApi() {
  try {
    const res = await fetch('/api/techniques');
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      TECHNIQUES.length = 0;
      data.forEach(t => TECHNIQUES.push(t));
    }
  } catch { /* use static default */ }
}

function renderTechniques() {
  loadTechniquesFromApi().then(() => {
    document.getElementById('techniques-grid').innerHTML = TECHNIQUES.map(t => `
      <div class="technique-card" onclick="navigate('technique-detail','${t.id}')">
        <div class="technique-title">${t.name}</div>
        <div class="technique-preview">${t.preview}</div>
        <div style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:0.68rem;color:var(--rose);font-weight:500;letter-spacing:0.08em;text-transform:uppercase">Read →</span>
          ${isAdmin ? `<div style="display:flex;gap:0.35rem" onclick="event.stopPropagation()">
            <button class="btn-admin-sm btn-edit" onclick="startEditTechnique('${t.id}')">Edit</button>
          </div>` : ''}
        </div>
      </div>`).join('');

    if (isAdmin) {
      let section = document.getElementById('admin-techniques-section');
      if (!section) {
        section = document.createElement('div');
        section.id = 'admin-techniques-section';
        section.style.marginTop = '3rem';
        section.innerHTML = `<div class="section-divider" style="margin-bottom:2rem;margin-left:0"></div><div id="technique-form-container"></div>`;
        document.getElementById('techniques-grid').parentElement.appendChild(section);
      }
      renderTechniqueForm(null);
    }
  });
}

function openTechniqueDetail(id) {
  const tech = TECHNIQUES.find(t => t.id === id);
  if (!tech) return;
  document.getElementById('technique-detail-content').innerHTML = `
  <div class="page-breadcrumb">
    <a onclick="navigate('techniques')">Techniques</a><span>/</span>
    <span class="current">${tech.name}</span>
  </div>
  <div class="technique-detail">
    <button class="recipe-back" onclick="navigate('techniques')">← Back to Techniques</button>
    ${isAdmin ? `<div style="display:flex;gap:0.5rem;margin-bottom:1rem">
      <button class="btn-admin-sm btn-edit" onclick="navigate('techniques');setTimeout(()=>startEditTechnique('${tech.id}'),160)">Edit Technique</button>
    </div>` : ''}
    <h1 class="recipe-detail-title">${tech.name}</h1>
    <p style="font-size:0.9rem;color:var(--text-secondary);line-height:1.74;margin:0.9rem 0 2rem">${tech.preview}</p>
    <div class="panel-title" style="margin-bottom:1.1rem">Step by Step</div>
    ${tech.steps.map((s,i) =>
      `<div class="technique-step"><div class="technique-step-num">${i+1}</div><div class="technique-step-text">${s}</div></div>`
    ).join('')}
    ${tech.tip ? `<div class="step-tip" style="margin-top:1.5rem"><strong>Tip:</strong> ${tech.tip}</div>` : ''}
    ${tech.relatedRecipes?.length ? `
    <div style="margin-top:2.5rem">
      <div class="panel-title" style="margin-bottom:1.1rem">Used In These Recipes</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.65rem">
        ${tech.relatedRecipes.map(rid =>
          `<button class="btn-outline" onclick="navigate('recipe-detail','${rid}')">${rid.replace(/-/g,' ')}</button>`
        ).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

function renderTechniqueForm(prefill) {
  const isEdit = !!editingTechniqueId;
  const t = prefill || {};
  const container = document.getElementById('technique-form-container');
  if (!container) return;
  container.innerHTML = `
  <div class="admin-panel">
    <h3 class="admin-title">${isEdit ? 'Edit Technique' : 'Add Technique'}</h3>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">ID (url-safe slug)</label>
        <input class="form-input" id="tf-id" placeholder="e.g. how-to-temper" value="${t.id||''}" ${isEdit?'readonly style="opacity:0.55"':''}>
      </div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="form-input" id="tf-name" placeholder="Technique name" value="${t.name||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Short Preview (1–2 sentences)</label>
      <textarea class="form-textarea" id="tf-preview" style="min-height:56px" placeholder="Brief overview">${t.preview||''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Steps — one per line</label>
      <textarea class="form-textarea" id="tf-steps" style="min-height:150px" placeholder="Step one&#10;Step two&#10;Step three">${(t.steps||[]).join('\n')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Pro Tip (optional)</label>
      <input class="form-input" id="tf-tip" placeholder="A helpful tip…" value="${t.tip||''}">
    </div>
    <div style="display:flex;gap:0.7rem;flex-wrap:wrap;margin-top:0.6rem">
      <button class="btn-primary" onclick="${isEdit?'saveEditTechnique()':'saveNewTechnique()'}" id="technique-save-btn">
        ${isEdit ? 'Save Changes' : 'Add Technique'}
      </button>
      ${isEdit ? `<button class="btn-outline" onclick="cancelEditTechnique()">Cancel</button>
        <button class="btn-admin-sm btn-delete" onclick="confirmDeleteTechnique('${t.id}','${(t.name||'').replace(/'/g,"\\'")}')">Delete</button>` : ''}
    </div>
  </div>`;
}

function collectTechniqueData() {
  const id   = document.getElementById('tf-id').value.trim().replace(/\s+/g,'-').toLowerCase();
  const name = document.getElementById('tf-name').value.trim();
  if (!id || !name) { showToast('ID and Name are required.'); return null; }
  return {
    id, name,
    preview: document.getElementById('tf-preview').value.trim(),
    steps:   document.getElementById('tf-steps').value.split('\n').map(s=>s.trim()).filter(Boolean),
    tip:     document.getElementById('tf-tip').value.trim() || null,
    relatedRecipes: TECHNIQUES.find(t => t.id === id)?.relatedRecipes || [],
  };
}

async function saveNewTechnique() {
  const data = collectTechniqueData(); if (!data) return;
  const btn = document.getElementById('technique-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res = await fetch('/api/techniques', { method:'POST', headers:{...getAuthHeaders(),'Content-Type':'application/json'}, body:JSON.stringify(data) });
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    TECHNIQUES.push(result);
    showToast(`"${result.name}" added`);
    editingTechniqueId = null;
    renderTechniques();
  } catch (err) { showToast('Error: ' + err.message); btn.disabled=false; btn.textContent='Add Technique'; }
}

function startEditTechnique(id) {
  editingTechniqueId = id;
  const tech = TECHNIQUES.find(t => t.id === id);
  if (!tech) return;
  const section = document.getElementById('admin-techniques-section');
  if (section) { renderTechniqueForm(tech); section.scrollIntoView({ behavior:'smooth', block:'start' }); }
}

async function saveEditTechnique() {
  const data = collectTechniqueData(); if (!data) return;
  const btn = document.getElementById('technique-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res = await fetch(`/api/techniques/${editingTechniqueId}`, { method:'PUT', headers:{...getAuthHeaders(),'Content-Type':'application/json'}, body:JSON.stringify(data) });
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    const idx = TECHNIQUES.findIndex(t => t.id === editingTechniqueId);
    if (idx > -1) TECHNIQUES[idx] = result;
    showToast(`"${result.name}" updated`);
    editingTechniqueId = null;
    renderTechniques();
  } catch (err) { showToast('Error: ' + err.message); btn.disabled=false; btn.textContent='Save Changes'; }
}

function cancelEditTechnique() { editingTechniqueId = null; renderTechniqueForm(null); }

function confirmDeleteTechnique(id, name) {
  document.getElementById('confirm-message').textContent = `Delete technique "${name}"?`;
  document.getElementById('confirm-yes').onclick = async () => {
    closeModal('confirm-modal');
    try {
      await fetch(`/api/techniques/${id}`, { method:'DELETE', headers:getAuthHeaders() });
      const idx = TECHNIQUES.findIndex(t => t.id === id);
      if (idx > -1) TECHNIQUES.splice(idx, 1);
      showToast(`"${name}" deleted`);
      editingTechniqueId = null;
      renderTechniques();
    } catch { showToast('Delete failed.'); }
  };
  document.getElementById('confirm-modal').style.display = 'flex';
}

// ══ TIPS ══════════════════════════════════════════════
let editingTipIndex = null;

async function loadTipsFromApi() {
  try {
    const res = await fetch('/api/tips');
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      TIPS.length = 0; data.forEach(t => TIPS.push(t));
    }
  } catch { /* use static */ }
}

function renderTips() {
  loadTipsFromApi().then(() => {
    document.getElementById('tips-grid').innerHTML = TIPS.map((t, i) => `
      <div class="tip-card">
        <div style="flex:1">
          <div class="tip-title">${t.title}</div>
          <div class="tip-text">${t.text}</div>
          ${isAdmin ? `<div style="display:flex;gap:0.45rem;margin-top:0.65rem">
            <button class="btn-admin-sm btn-edit" onclick="startEditTip(${i})">Edit</button>
            <button class="btn-admin-sm btn-delete" onclick="confirmDeleteTip(${i},'${t.title.replace(/'/g,"\\'")}')">Delete</button>
          </div>` : ''}
        </div>
      </div>`).join('');

    if (isAdmin) {
      let section = document.getElementById('admin-tips-section');
      if (!section) {
        section = document.createElement('div');
        section.id = 'admin-tips-section';
        section.style.marginTop = '3rem';
        section.innerHTML = `<div class="section-divider" style="margin-bottom:2rem;margin-left:0"></div><div id="tip-form-container"></div>`;
        document.getElementById('tips-grid').parentElement.appendChild(section);
      }
      renderTipForm(null);
    }
  });
}

function renderTipForm(prefill) {
  const isEdit = editingTipIndex !== null;
  const t = prefill || {};
  const container = document.getElementById('tip-form-container');
  if (!container) return;
  container.innerHTML = `
  <div class="admin-panel">
    <h3 class="admin-title">${isEdit ? 'Edit Tip' : 'Add Tip'}</h3>
    <div class="form-group">
      <label class="form-label">Title</label>
      <input class="form-input" id="tip-title" placeholder="Tip title" value="${t.title||''}">
    </div>
    <div class="form-group">
      <label class="form-label">Tip Text</label>
      <textarea class="form-textarea" id="tip-text" placeholder="Describe the tip in detail…">${t.text||''}</textarea>
    </div>
    <div style="display:flex;gap:0.7rem;flex-wrap:wrap;margin-top:0.6rem">
      <button class="btn-primary" onclick="${isEdit?'saveEditTip()':'saveNewTip()'}" id="tip-save-btn">
        ${isEdit ? 'Save Changes' : 'Add Tip'}
      </button>
      ${isEdit ? '<button class="btn-outline" onclick="cancelEditTip()">Cancel</button>' : ''}
    </div>
  </div>`;
}

async function saveNewTip() {
  const title = document.getElementById('tip-title').value.trim();
  const text  = document.getElementById('tip-text').value.trim();
  if (!title || !text) { showToast('Title and text are required.'); return; }
  const btn = document.getElementById('tip-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res = await fetch('/api/tips', { method:'POST', headers:{...getAuthHeaders(),'Content-Type':'application/json'}, body:JSON.stringify({ title, text }) });
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    TIPS.push(result);
    showToast(`"${title}" added`);
    editingTipIndex = null;
    renderTips();
  } catch (err) { showToast('Error: ' + err.message); btn.disabled=false; btn.textContent='Add Tip'; }
}

function startEditTip(index) {
  editingTipIndex = index;
  renderTipForm(TIPS[index]);
  document.getElementById('admin-tips-section')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

async function saveEditTip() {
  const title = document.getElementById('tip-title').value.trim();
  const text  = document.getElementById('tip-text').value.trim();
  if (!title || !text) { showToast('Title and text are required.'); return; }
  const btn = document.getElementById('tip-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res = await fetch(`/api/tips/${editingTipIndex}`, { method:'PUT', headers:{...getAuthHeaders(),'Content-Type':'application/json'}, body:JSON.stringify({ title, text }) });
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    TIPS[editingTipIndex] = result;
    showToast(`"${title}" updated`);
    editingTipIndex = null;
    renderTips();
  } catch (err) { showToast('Error: ' + err.message); btn.disabled=false; btn.textContent='Save Changes'; }
}

function cancelEditTip() { editingTipIndex = null; renderTipForm(null); }

function confirmDeleteTip(index, name) {
  document.getElementById('confirm-message').textContent = `Delete tip "${name}"?`;
  document.getElementById('confirm-yes').onclick = async () => {
    closeModal('confirm-modal');
    try {
      await fetch(`/api/tips/${index}`, { method:'DELETE', headers:getAuthHeaders() });
      TIPS.splice(index, 1);
      showToast(`"${name}" deleted`);
      editingTipIndex = null;
      renderTips();
    } catch { showToast('Delete failed.'); }
  };
  document.getElementById('confirm-modal').style.display = 'flex';
}

// ══ SEARCH ════════════════════════════════════════════
let searchTimeout;
function handleSearch(q) {
  clearTimeout(searchTimeout);
  if (!q.trim()) return;
  searchTimeout = setTimeout(() => performSearch(q), 300);
}

async function performSearch(q) {
  const query = q.toLowerCase();
  let recipeResults = [], techResults = [], tipResults = [];
  try { recipeResults = await apiGetRecipes({ q }); } catch {}
  techResults = TECHNIQUES.filter(t =>
    t.name.toLowerCase().includes(query) || t.preview.toLowerCase().includes(query));
  tipResults = TIPS.filter(t =>
    t.title.toLowerCase().includes(query) || t.text.toLowerCase().includes(query));
  const total = recipeResults.length + techResults.length + tipResults.length;
  document.getElementById('search-count').textContent = total;
  let html = '';
  if (recipeResults.length)
    html += `<div style="margin-bottom:2.4rem"><div class="section-eyebrow" style="margin-bottom:1.1rem">Recipes (${recipeResults.length})</div><div class="recipe-grid">${recipeResults.map(r=>recipeCardHTML(r)).join('')}</div></div>`;
  if (techResults.length)
    html += `<div style="margin-bottom:2.4rem"><div class="section-eyebrow" style="margin-bottom:1.1rem">Techniques (${techResults.length})</div><div class="technique-grid">${techResults.map(t=>`<div class="technique-card" onclick="navigate('technique-detail','${t.id}')"><div class="technique-title">${t.name}</div><div class="technique-preview">${t.preview}</div></div>`).join('')}</div></div>`;
  if (tipResults.length)
    html += `<div><div class="section-eyebrow" style="margin-bottom:1.1rem">Tips & Tricks (${tipResults.length})</div><div class="tips-grid">${tipResults.map(t=>`<div class="tip-card"><div><div class="tip-title">${t.title}</div><div class="tip-text">${t.text}</div></div></div>`).join('')}</div></div>`;
  if (!html)
    html = `<div class="empty-state"><div class="empty-title">Nothing found for "${q}"</div><div class="empty-text">Try a different search term.</div></div>`;
  document.getElementById('search-results-content').innerHTML = html;
  navigate('search');
}

// ══ ADMIN ═════════════════════════════════════════════
function showAdminLogin() {
  document.getElementById('admin-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('admin-password').focus(), 100);
}

async function tryAdminLogin() {
  const pwd    = document.getElementById('admin-password').value;
  const result = await apiLogin(pwd);
  if (result.token) {
    sessionStorage.setItem('admin_token', result.token);
    isAdmin = true;
    closeModal('admin-modal');
    document.getElementById('admin-toggle-btn').style.display  = 'none';
    document.getElementById('admin-logout-btn').style.display  = 'inline-block';
    document.getElementById('admin-badge-nav').style.display   = 'inline-flex';
    document.getElementById('admin-password').value = '';
    showToast('Admin mode enabled');
    navigate(currentPage);
    apiGetAutofillMode().then(mode => {
      if (mode && !mode.claudeAvailable) {
        autofillMode = 'scraper';
        showToast('No Claude API key found — using web scraper for autofill');
      }
    }).catch(() => {});
  } else {
    document.getElementById('admin-password').style.borderColor = 'var(--rose-dark)';
    showToast('Incorrect password');
    setTimeout(() => {
      const el = document.getElementById('admin-password');
      if (el) el.style.borderColor = '';
    }, 2000);
  }
}

async function logoutAdmin() {
  await apiLogout();
  isAdmin = false;
  editingRecipeId   = null;
  editingCreationId = null;
  document.getElementById('admin-toggle-btn').style.display  = 'inline-block';
  document.getElementById('admin-logout-btn').style.display  = 'none';
  document.getElementById('admin-badge-nav').style.display   = 'none';
  navigate(currentPage);
  showToast('Logged out of admin mode');
}

// ══ UTILS ═════════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 3000);
}

function closeModal(id)                { document.getElementById(id).style.display = 'none'; }
function closeModalOutside(e, id)      { if (e.target.classList.contains('modal-overlay')) closeModal(id); }
function toggleMobileMenu()            { document.getElementById('mobile-menu').classList.toggle('open'); }
function closeMobileMenu()             { document.getElementById('mobile-menu').classList.remove('open'); }

// ══ CONTACT FORM ══════════════════════════════════════
// Submits to a Google Apps Script Web App URL which writes to Google Sheets.
// Set your Web App URL in .env as GOOGLE_SHEETS_URL (server proxies it so
// the URL stays private), or set window.GOOGLE_SHEETS_URL directly here.
const SHEETS_URL = window.GOOGLE_SHEETS_URL || '';

async function submitContactForm() {
  const name    = document.getElementById('contact-name')?.value.trim();
  const email   = document.getElementById('contact-email')?.value.trim();
  const subject = document.getElementById('contact-subject')?.value;
  const message = document.getElementById('contact-message')?.value.trim();

  if (!name || !email || !message) {
    showToast('Please fill in your name, email, and message.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.');
    return;
  }

  const btn    = document.getElementById('contact-submit-btn');
  const status = document.getElementById('contact-status');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  if (status) status.textContent = '';

  const payload = {
    name, email, subject, message,
    timestamp: new Date().toISOString(),
    page: window.location.href,
  };

  try {
    // Try server proxy first (keeps Sheets URL private)
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Server error');
    const result = await res.json();
    if (result.error) throw new Error(result.error);

    showContactSuccess();
  } catch (serverErr) {
    // Fallback: submit directly to Sheets URL if configured on client
    if (SHEETS_URL) {
      try {
        await fetch(SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors', // Google Apps Script requires no-cors
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        // no-cors means we can't read the response, but if it didn't throw it worked
        showContactSuccess();
        return;
      } catch { /* fall through to error */ }
    }
    showToast('Could not send message. Please email directly.');
    if (status) status.textContent = 'Submission failed — please try again.';
    btn.disabled = false;
    btn.textContent = 'Send Message';
  }
}

function showContactSuccess() {
  document.getElementById('contact-form').style.display = 'none';
  document.getElementById('contact-success').style.display = 'block';
}

function resetContactForm() {
  ['contact-name','contact-email','contact-message'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('contact-form').style.display = 'block';
  document.getElementById('contact-success').style.display = 'none';
  document.getElementById('contact-submit-btn').disabled = false;
  document.getElementById('contact-submit-btn').textContent = 'Send Message';
}

// ══ INIT ══════════════════════════════════════════════
// Restore admin nav UI if a valid session token already exists
if (isAdmin) {
  const toggleBtn  = document.getElementById('admin-toggle-btn');
  const logoutBtn  = document.getElementById('admin-logout-btn');
  const badgeNav   = document.getElementById('admin-badge-nav');
  if (toggleBtn)  toggleBtn.style.display  = 'none';
  if (logoutBtn)  logoutBtn.style.display  = 'inline-block';
  if (badgeNav)   badgeNav.style.display   = 'inline-flex';
}

const params = new URLSearchParams(window.location.search);
if (params.get('recipe')) navigate('recipe-detail', params.get('recipe'));
else navigate('home');
