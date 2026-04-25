// app.js — Main application logic

// ══ STATE ════════════════════════════════════════════
let isAdmin = false;
let currentPage = 'home';
let currentRecipe = null;
let currentScale = 1;
let useGrams = false;
let autofillMode = 'claude'; // 'claude' or 'scraper'
let favorites = JSON.parse(localStorage.getItem('sc_favorites') || '{}');
let creationFavs = JSON.parse(localStorage.getItem('sc_creation_favs') || '{}');
let notes = JSON.parse(localStorage.getItem('sc_notes') || '{}');
let editingRecipeId = null;
let editingCreationId = null;

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
  if (page === 'home') loadFeatured();
  if (page === 'recipes') loadRecipes();
  if (page === 'creations') loadCreations();
  if (page === 'products') renderProducts('cakes');
  if (page === 'techniques') renderTechniques();
  if (page === 'tips') renderTips();
  if (page === 'recipe-detail' && data) loadRecipeDetail(data);
  if (page === 'technique-detail' && data) openTechniqueDetail(data);
}

// ══ MEASUREMENT HELPERS ═══════════════════════════════
const FRACS = { 0.125: '⅛', 0.25: '¼', 0.333: '⅓', 0.5: '½', 0.667: '⅔', 0.75: '¾' };
function formatFrac(n) {
  if (!n || n === Math.floor(n)) return String(n || 0);
  const w = Math.floor(n), f = n - w;
  const key = Object.keys(FRACS).reduce((a, b) => Math.abs(b - f) < Math.abs(a - f) ? b : a);
  return w > 0 ? `${w} ${FRACS[key]}` : FRACS[key] || f.toFixed(2);
}
function scaleAmount(amount, unit, scale) {
  const s = amount * scale;
  if (useGrams) return null; // handled by grams
  if (unit === 'cup') {
    if (s < 0.0625) return { val: Math.round(s * 48 * 4) / 4, unit: 'tsp' };
    if (s < 0.25) return { val: Math.round(s * 16 * 2) / 2, unit: 'tbsp' };
  }
  if (unit === 'tbsp' && s < 1) return { val: Math.round(s * 3 * 4) / 4, unit: 'tsp' };
  return { val: s, unit };
}
function displayIngredient(ing, scale) {
  if (!ing.unit || ing.unit === 'flax egg') {
    return formatFrac(ing.amount * scale) + (ing.unit ? ' ' + ing.unit : '');
  }
  if (useGrams && ing.grams) return Math.round(ing.grams * scale) + 'g';
  const { val, unit } = scaleAmount(ing.amount, ing.unit, scale);
  return formatFrac(val) + ' ' + unit;
}

// ══ FEATURED (HOME) ═══════════════════════════════════
async function loadFeatured() {
  const el = document.getElementById('featured-recipes');
  el.innerHTML = '<div style="grid-column:1/-1;padding:2rem;text-align:center;color:var(--text-light)">Loading…</div>';
  try {
    const recipes = await apiGetRecipes();
    const featured = recipes.slice(0, 3);
    el.innerHTML = featured.length ? featured.map(r => recipeCardHTML(r)).join('') : '<div class="empty-state"><div class="empty-icon">🍰</div><div class="empty-title">No recipes yet</div></div>';
  } catch { el.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load recipes</div><div class="empty-text">Make sure the server is running.</div></div>'; }
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
    el.innerHTML = recipes.length ? recipes.map(r => recipeCardHTML(r)).join('') : `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No recipes found</div></div>`;
  } catch { el.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load recipes</div></div>'; }
  // Show admin form
  const adminDiv = document.getElementById('admin-add-recipe');
  adminDiv.style.display = isAdmin ? 'block' : 'none';
  if (isAdmin) renderRecipeForm(null);
}

function filterRecipes(filter, btn) {
  document.querySelectorAll('#page-recipes .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadRecipes(filter);
}

function recipeCardHTML(r) {
  const isFav = favorites[r.id];
  const adminBtns = isAdmin ? `<div class="recipe-card-admin">
    <button class="btn-admin-sm btn-edit" onclick="event.stopPropagation();startEditRecipe('${r.id}')">Edit</button>
    <button class="btn-admin-sm btn-delete" onclick="event.stopPropagation();confirmDeleteRecipe('${r.id}','${r.name.replace(/'/g, "\\'")}')">Delete</button>
  </div>` : '';
  const imgContent = r.photo
    ? `<img src="${r.photo}" alt="${r.name}" loading="lazy">`
    : `<span>${r.emoji || '🍰'}</span>`;
  return `<div class="recipe-card" onclick="navigate('recipe-detail','${r.id}')">
    <div class="recipe-card-img">
      ${imgContent}
      <span class="recipe-card-badge">${r.category}</span>
      <button class="recipe-card-fav" onclick="event.stopPropagation();toggleFav('${r.id}')">${isFav ? '♥' : '♡'}</button>
      ${adminBtns}
    </div>
    <div class="recipe-card-body">
      <div class="recipe-card-title">${r.name}</div>
      <div class="recipe-card-meta">
        ${r.prep ? `<span>⏱ ${r.prep}</span>` : ''}
        ${r.bake ? `<span>🔥 ${r.bake}</span>` : ''}
        ${r.servings ? `<span>👤 ${r.servings}</span>` : ''}
      </div>
      <div class="recipe-card-tags">${(r.tags||[]).map(t => `<span class="tag ${t}">${t}</span>`).join('')}</div>
    </div>
  </div>`;
}

function toggleFav(id) {
  favorites[id] = !favorites[id];
  localStorage.setItem('sc_favorites', JSON.stringify(favorites));
  loadFeatured();
  if (currentPage === 'recipes') loadRecipes();
  showToast(favorites[id] ? '♥ Added to favorites' : 'Removed from favorites');
}

// ══ RECIPE DETAIL ════════════════════════════════════
async function loadRecipeDetail(id) {
  const container = document.getElementById('recipe-detail-content');
  container.innerHTML = '<div style="text-align:center;padding:4rem;color:var(--text-light)">Loading…</div>';
  try {
    const recipe = await apiGetRecipe(id);
    currentRecipe = recipe;
    currentScale = 1;
    renderRecipeDetail(recipe);
  } catch {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load recipe</div></div>';
  }
}

function renderRecipeDetail(recipe) {
  const isFav = favorites[recipe.id];
  const adminBtns = isAdmin ? `
    <button class="btn-admin-sm btn-edit" onclick="startEditRecipe('${recipe.id}')">✎ Edit Recipe</button>
    <button class="btn-admin-sm btn-delete" onclick="confirmDeleteRecipe('${recipe.id}','${recipe.name.replace(/'/g, "\\'")}')">✕ Delete</button>` : '';
  document.getElementById('recipe-detail-content').innerHTML = `
  <div class="page-breadcrumb">
    <a onclick="navigate('recipes')">Recipes</a><span>/</span>
    <span class="current">${recipe.name}</span>
  </div>
  <div class="recipe-detail">
    <button class="recipe-back" onclick="navigate('recipes')">← Back to Recipes</button>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem">
      <h1 class="recipe-detail-title">${recipe.emoji || ''} ${recipe.name}</h1>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">${adminBtns}</div>
    </div>
    ${recipe.photo ? `<img src="${recipe.photo}" alt="${recipe.name}" style="width:100%;max-height:360px;object-fit:cover;border-radius:var(--radius-lg);margin:1rem 0">` : ''}
    <p style="font-size:0.92rem;color:var(--text-muted);margin:0.75rem 0 1.25rem;line-height:1.65">${recipe.description || ''}</p>
    ${recipe.hasVinegar ? `<div class="vinegar-notice">🍋 All vinegar substituted with lemon juice (1:1)</div>` : ''}
    <div class="recipe-detail-meta">
      ${recipe.prep ? `<span>⏱ Prep: <strong>${recipe.prep}</strong></span>` : ''}
      ${recipe.bake ? `<span>🔥 Bake: <strong>${recipe.bake}</strong></span>` : ''}
      <span>👤 Serves: <strong id="serves-display">${recipe.servings}</strong></span>
      ${recipe.sourceUrl ? `<span><a href="${recipe.sourceUrl}" target="_blank" rel="noopener" style="color:var(--dusty-rose);font-size:0.8rem">View original ↗</a></span>` : ''}
    </div>
    <div class="recipe-actions">
      <div class="scale-control">
        <span class="scale-label">Scale</span>
        ${[0.25,0.5,1,1.5,2].map(s => `<button class="scale-btn${s===1?' active':''}" onclick="setScale(${s},this)">${s===0.25?'¼×':s===0.5?'½×':s===1?'1×':s===1.5?'1½×':'2×'}</button>`).join('')}
      </div>
      <div class="unit-toggle">
        <button class="unit-btn active" id="btn-standard" onclick="setUnit('standard')">Standard</button>
        <button class="unit-btn" id="btn-grams" onclick="setUnit('grams')">Grams</button>
      </div>
      <button class="share-btn" onclick="toggleFav('${recipe.id}')" id="detail-fav-btn">${isFav?'♥ Favorited':'♡ Favorite'}</button>
      <div style="position:relative">
        <button class="share-btn" onclick="toggleShareDropdown(event)">⤴ Share</button>
        <div id="share-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 8px);background:var(--warm-white);border:1px solid var(--border);border-radius:var(--radius);padding:0.5rem;box-shadow:var(--shadow-hover);z-index:50;min-width:210px">
          <button class="share-option" onclick="shareRecipe('recipe-only')">📋 Recipe only</button>
          <button class="share-option" onclick="shareRecipe('result-only')">🖼 Result + recipe</button>
          <button class="share-option" onclick="shareRecipe('pdf')">⬇ Download PDF</button>
          <button class="share-option" onclick="shareRecipe('link')">🔗 Copy link</button>
        </div>
      </div>
    </div>
    <div class="recipe-layout">
      <div class="ingredients-panel">
        <div class="panel-title">Ingredients</div>
        <div id="ingredients-list"></div>
      </div>
      <div>
        <div class="panel-title" style="margin-bottom:1.5rem">Method</div>
        <div id="steps-list"></div>
        <div class="notes-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
            <span style="font-size:0.75rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted)">📝 My Notes</span>
            <span style="font-size:0.72rem;color:var(--text-light)">Auto-saved</span>
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
  el.innerHTML = (recipe.ingredients).map(ing => {
    const amt = displayIngredient(ing, scale);
    const nameHtml = ing.isSubstituted
      ? `<span style="color:var(--sage)">${ing.name}</span><span class="ingredient-note">substituted for ${ing.originalName} (1:1)</span>`
      : ing.name;
    const techLink = ing.technique
      ? `<button class="step-technique-link" onclick="navigate('technique-detail','${ing.technique}')">→ Technique</button>`
      : '';
    return `<div class="ingredient-item">
      <div class="ingredient-amount">${amt}</div>
      <div class="ingredient-name">${nameHtml}${techLink}</div>
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
    const techLink = tech ? `<button class="step-technique-link" onclick="navigate('technique-detail','${tech.id}')">→ See technique: ${tech.name}</button>` : '';
    const tip = step.tip ? `<div class="step-tip"><strong>Tip:</strong> ${step.tip}</div>` : '';
    return `<div class="step-item">
      <div class="step-number">${i+1}</div>
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
  document.getElementById('btn-standard').classList.toggle('active', !useGrams);
  document.getElementById('btn-grams').classList.toggle('active', useGrams);
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
    const url = `${location.origin}?recipe=${currentRecipe.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast('🔗 Link copied to clipboard!');
    return;
  }
  if (type === 'pdf') { window.print(); return; }
  showToast('Shared!');
}

document.addEventListener('click', () => {
  const dd = document.getElementById('share-dropdown');
  if (dd) dd.style.display = 'none';
});

// ══ ADMIN: RECIPE FORM ════════════════════════════════
function renderRecipeForm(prefill) {
  const isEdit = !!editingRecipeId;
  const r = prefill || {};
  document.getElementById('recipe-form-container').innerHTML = `
  <div class="admin-panel">
    <h3 class="admin-title">${isEdit ? 'Edit Recipe' : 'Add New Recipe'}</h3>
    ${!isEdit ? `
    <div class="scraper-toggle">
      <span class="scraper-toggle-label">Autofill mode</span>
      <button class="scraper-mode-btn ${autofillMode==='claude'?'active':''}" onclick="setAutofillMode('claude',this)">✦ Claude AI</button>
      <button class="scraper-mode-btn ${autofillMode==='scraper'?'active':''}" onclick="setAutofillMode('scraper',this)">🔍 Web Scraper</button>
    </div>
    <div class="form-group">
      <label class="form-label">Recipe URL (autofill)</label>
      <div style="display:flex;gap:0.75rem">
        <input class="form-input" id="recipe-url-input" placeholder="https://..." style="flex:1">
        <button class="btn-admin-big" id="autofill-btn" onclick="runAutofill()">
          <span id="af-spinner"></span><span id="af-label">Autofill</span>
        </button>
      </div>
    </div>` : ''}
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Recipe Name *</label>
        <input class="form-input" id="rf-name" placeholder="e.g. Chocolate Lava Cake" value="${r.name||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="rf-category">
          ${['cakes','cupcakes','cookies','frosting','other'].map(c => `<option value="${c}" ${r.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
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
        <label class="form-label">Emoji</label>
        <input class="form-input" id="rf-emoji" placeholder="🎂" value="${r.emoji||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Tags (comma separated)</label>
      <input class="form-input" id="rf-tags" placeholder="vegan, chocolate, easy" value="${(r.tags||[]).join(', ')}">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="rf-description" placeholder="A short description of this recipe…">${r.description||''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Source URL (original recipe link)</label>
      <input class="form-input" id="rf-source" placeholder="https://..." value="${r.sourceUrl||''}">
    </div>
    <div class="form-group">
      <label class="form-label">Photo</label>
      <div class="upload-zone" onclick="document.getElementById('rf-photo').click()">
        <div class="upload-zone-icon">📷</div>
        <div id="rf-photo-label">${r.photo ? 'Current photo saved. Click to replace.' : 'Click to upload photo'}</div>
        <input type="file" id="rf-photo" accept="image/*" style="display:none" onchange="document.getElementById('rf-photo-label').textContent=this.files[0]?.name||'No file chosen'">
      </div>
    </div>
    <div style="display:flex;gap:0.75rem;margin-top:0.5rem;flex-wrap:wrap">
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
  showToast(`Autofill mode: ${mode === 'claude' ? 'Claude AI' : 'Web Scraper'}`);
}

async function runAutofill() {
  const url = document.getElementById('recipe-url-input')?.value.trim();
  if (!url) { showToast('Please enter a URL first.'); return; }
  const btn = document.getElementById('autofill-btn');
  const spinner = document.getElementById('af-spinner');
  const label = document.getElementById('af-label');
  btn.disabled = true;
  spinner.innerHTML = '<span class="loading-spinner"></span>';
  label.textContent = 'Fetching…';
  try {
    const result = await apiAutofill(url, autofillMode);
    if (result.error) throw new Error(result.error);
    const d = result.data;
    if (d.name) document.getElementById('rf-name').value = d.name;
    if (d.category) document.getElementById('rf-category').value = d.category;
    if (d.prep) document.getElementById('rf-prep').value = d.prep;
    if (d.bake) document.getElementById('rf-bake').value = d.bake;
    if (d.servings) document.getElementById('rf-servings').value = d.servings;
    if (d.emoji) document.getElementById('rf-emoji').value = d.emoji;
    if (d.tags) document.getElementById('rf-tags').value = Array.isArray(d.tags) ? d.tags.join(', ') : d.tags;
    if (d.description) document.getElementById('rf-description').value = d.description;
    showToast(`✦ Autofilled via ${d._extractedBy || autofillMode}!`);
  } catch (err) {
    showToast('Autofill failed: ' + err.message);
  } finally {
    btn.disabled = false;
    spinner.innerHTML = '';
    label.textContent = 'Autofill';
  }
}

function collectRecipeFormData() {
  const fd = new FormData();
  const data = {
    name: document.getElementById('rf-name').value.trim(),
    category: document.getElementById('rf-category').value,
    prep: document.getElementById('rf-prep').value.trim(),
    bake: document.getElementById('rf-bake').value.trim(),
    servings: document.getElementById('rf-servings').value,
    emoji: document.getElementById('rf-emoji').value.trim() || '🍰',
    tags: document.getElementById('rf-tags').value.split(',').map(s=>s.trim()).filter(Boolean),
    description: document.getElementById('rf-description').value.trim(),
    sourceUrl: document.getElementById('rf-source')?.value.trim() || '',
  };
  if (!data.name) { showToast('Recipe name is required.'); return null; }
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
    showToast(`"${result.name}" added!`);
    editingRecipeId = null;
    await loadRecipes();
    window.scrollTo(0, 0);
  } catch (err) {
    showToast('Error: ' + err.message);
    btn.disabled = false; btn.textContent = 'Add Recipe';
  }
}

async function startEditRecipe(id) {
  editingRecipeId = id;
  navigate('recipes');
  // Wait for render then scroll to form
  setTimeout(async () => {
    const recipe = await apiGetRecipe(id).catch(() => null);
    if (!recipe) return;
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
    showToast(`"${result.name}" updated!`);
    editingRecipeId = null;
    await loadRecipes();
    window.scrollTo(0, 0);
  } catch (err) {
    showToast('Error: ' + err.message);
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

function cancelEditRecipe() {
  editingRecipeId = null;
  renderRecipeForm(null);
}

function confirmDeleteRecipe(id, name) {
  document.getElementById('confirm-message').textContent = `Are you sure you want to delete "${name}"? This cannot be undone.`;
  document.getElementById('confirm-yes').onclick = async () => {
    closeModal('confirm-modal');
    try {
      await apiDeleteRecipe(id);
      showToast(`"${name}" deleted.`);
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
    if (currentCreationFilter === 'favorites') creations = creations.filter(c => creationFavs[c.id] !== undefined ? creationFavs[c.id] : c.favorite);
    el.innerHTML = creations.length ? creations.map(c => creationCardHTML(c)).join('') : `<div class="empty-state"><div class="empty-icon">📷</div><div class="empty-title">Nothing here yet</div></div>`;
  } catch { el.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load creations</div></div>'; }
  const adminDiv = document.getElementById('admin-add-creation');
  adminDiv.style.display = isAdmin ? 'block' : 'none';
  if (isAdmin) renderCreationForm(null);
}

function filterCreations(filter, btn) {
  document.querySelectorAll('#page-creations .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadCreations(filter);
}

function creationCardHTML(c) {
  const isFav = creationFavs[c.id] !== undefined ? creationFavs[c.id] : c.favorite;
  const dateStr = c.date ? new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
  const eventLabel = { birthday:'🎂 Birthday', wedding:'💍 Wedding', graduation:'🎓 Graduation', holiday:'🎄 Holiday', other:'✨ Other' }[c.event] || c.event;
  const imgContent = c.photo ? `<img src="${c.photo}" alt="${c.name}" loading="lazy">` : `<span>${c.emoji||'🎂'}</span>`;
  const adminBtns = isAdmin ? `<div class="gallery-admin">
    <button class="btn-admin-sm btn-edit" onclick="startEditCreation('${c.id}')">Edit</button>
    <button class="btn-admin-sm btn-delete" onclick="confirmDeleteCreation('${c.id}','${c.name.replace(/'/g,"\\'")}')">Delete</button>
  </div>` : '';
  return `<div class="gallery-card">
    <div class="gallery-img">
      ${imgContent}
      <button class="gallery-fav" onclick="toggleCreationFav('${c.id}')">${isFav?'♥':'♡'}</button>
      ${adminBtns}
    </div>
    <div class="gallery-body">
      <div class="gallery-title">${c.name}</div>
      <div class="gallery-meta">${eventLabel} · ${dateStr}</div>
      <div class="gallery-layers">
        <div class="gallery-layer"><span class="gallery-layer-label">Base</span>${c.base}</div>
        <div class="gallery-layer"><span class="gallery-layer-label">Filling</span>${c.filling}</div>
        <div class="gallery-layer"><span class="gallery-layer-label">Décor</span>${c.decorations}</div>
      </div>
    </div>
  </div>`;
}

function toggleCreationFav(id) {
  const c_list = document.querySelectorAll('.gallery-fav');
  const current = creationFavs[id] !== undefined ? creationFavs[id] : false;
  creationFavs[id] = !current;
  localStorage.setItem('sc_creation_favs', JSON.stringify(creationFavs));
  // Persist to backend too
  const fd = new FormData();
  fd.append('data', JSON.stringify({ favorite: creationFavs[id] }));
  apiUpdateCreation(id, fd).catch(() => {});
  loadCreations();
  showToast(creationFavs[id] ? '♥ Added to favorites' : 'Removed from favorites');
}

function renderCreationForm(prefill) {
  const isEdit = !!editingCreationId;
  const c = prefill || {};
  document.getElementById('creation-form-container').innerHTML = `
  <div class="admin-panel">
    <h3 class="admin-title">${isEdit ? 'Edit Creation' : 'Add Creation'}</h3>
    <div class="form-group">
      <label class="form-label">Photo</label>
      <div class="upload-zone" onclick="document.getElementById('cf-photo').click()">
        <div class="upload-zone-icon">📷</div>
        <div id="cf-photo-label">${c.photo ? 'Current photo saved. Click to replace.' : 'Click to upload photo'}</div>
        <input type="file" id="cf-photo" accept="image/*" style="display:none" onchange="document.getElementById('cf-photo-label').textContent=this.files[0]?.name||'No file chosen'">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Creation Name *</label>
      <input class="form-input" id="cf-name" placeholder="e.g. Rose Vanilla Birthday Cake" value="${c.name||''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Event Category</label>
        <select class="form-select" id="cf-event">
          ${['birthday','wedding','graduation','holiday','other'].map(e => `<option value="${e}" ${c.event===e?'selected':''}>${e.charAt(0).toUpperCase()+e.slice(1)}</option>`).join('')}
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
      <input class="form-input" id="cf-filling" placeholder="e.g. Raspberry Jam + Buttercream" value="${c.filling||''}">
    </div>
    <div class="form-group">
      <label class="form-label">Decorations / Frosting / Toppings</label>
      <input class="form-input" id="cf-decorations" placeholder="e.g. Swiss Meringue Buttercream, fresh roses" value="${c.decorations||''}">
    </div>
    <div style="display:flex;gap:0.75rem;margin-top:0.5rem;flex-wrap:wrap">
      <button class="btn-primary" onclick="${isEdit?'saveEditCreation()':'saveNewCreation()'}" id="creation-save-btn">
        ${isEdit ? 'Save Changes' : 'Add Creation'}
      </button>
      ${isEdit ? '<button class="btn-outline" onclick="cancelEditCreation()">Cancel</button>' : ''}
    </div>
  </div>`;
}

function collectCreationFormData() {
  const fd = new FormData();
  const name = document.getElementById('cf-name').value.trim();
  if (!name) { showToast('Creation name is required.'); return null; }
  fd.append('data', JSON.stringify({
    name,
    event: document.getElementById('cf-event').value,
    date: document.getElementById('cf-date').value || new Date().toISOString().split('T')[0],
    base: document.getElementById('cf-base').value.trim(),
    filling: document.getElementById('cf-filling').value.trim(),
    decorations: document.getElementById('cf-decorations').value.trim(),
    emoji: '🎂',
  }));
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
    showToast(`"${result.name}" added!`);
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
    const res = await fetch(`/api/creations/${id}`).then(r=>r.json()).catch(() => null);
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
    showToast(`"${result.name}" updated!`);
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
  document.getElementById('confirm-message').textContent = `Are you sure you want to delete "${name}"? This cannot be undone.`;
  document.getElementById('confirm-yes').onclick = async () => {
    closeModal('confirm-modal');
    try {
      await apiDeleteCreation(id);
      showToast(`"${name}" deleted.`);
      await loadCreations();
    } catch { showToast('Delete failed.'); }
  };
  document.getElementById('confirm-modal').style.display = 'flex';
}

// ══ PRODUCTS ════════════════════════════════════════
function renderProducts(category) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = (PRODUCTS[category]||[]).map(p => `
    <div class="product-card">
      <div class="product-icon">${p.icon}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-desc">${p.desc}</div>
      <div class="product-pricing">${p.pricing.map(pr=>`<div class="price-row"><span>${pr.size} · serves ${pr.serves}</span><span class="price-amount">${pr.price}</span></div>`).join('')}</div>
      <button class="btn-primary" style="margin-top:0.75rem;font-size:0.78rem" onclick="showToast('Order inquiry sent! Saanji will be in touch.')">Inquire to Order</button>
    </div>`).join('');
}

function switchProductTab(cat, btn) {
  document.querySelectorAll('.product-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  renderProducts(cat);
}

// ══ TECHNIQUES ══════════════════════════════════════
function renderTechniques() {
  document.getElementById('techniques-grid').innerHTML = TECHNIQUES.map(t => `
    <div class="technique-card" onclick="navigate('technique-detail','${t.id}')">
      <div class="technique-icon">${t.icon}</div>
      <div class="technique-title">${t.name}</div>
      <div class="technique-preview">${t.preview}</div>
      <div style="margin-top:1rem"><span style="font-size:0.72rem;color:var(--dusty-rose);font-weight:500;letter-spacing:0.08em;text-transform:uppercase">Read technique →</span></div>
    </div>`).join('');
}

function openTechniqueDetail(id) {
  const tech = TECHNIQUES.find(t=>t.id===id);
  if (!tech) return;
  document.getElementById('technique-detail-content').innerHTML = `
  <div class="page-breadcrumb"><a onclick="navigate('techniques')">Techniques</a><span>/</span><span class="current">${tech.name}</span></div>
  <div class="technique-detail">
    <button class="recipe-back" onclick="navigate('techniques')">← Back to Techniques</button>
    <div style="font-size:3rem;margin-bottom:1rem">${tech.icon}</div>
    <h1 class="recipe-detail-title">${tech.name}</h1>
    <p style="font-size:0.92rem;color:var(--text-muted);line-height:1.7;margin:1rem 0 2rem">${tech.preview}</p>
    <div class="panel-title" style="margin-bottom:1.25rem">Step by Step</div>
    ${tech.steps.map((s,i)=>`<div class="technique-step"><div class="technique-step-num">${i+1}</div><div class="technique-step-text">${s}</div></div>`).join('')}
    ${tech.tip?`<div class="step-tip" style="margin-top:1.5rem"><strong>Pro Tip:</strong> ${tech.tip}</div>`:''}
    ${tech.relatedRecipes?.length?`
    <div style="margin-top:2.5rem">
      <div class="panel-title" style="margin-bottom:1.25rem">Used In These Recipes</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.75rem">
        ${tech.relatedRecipes.map(rid=>`<button class="btn-outline" onclick="navigate('recipe-detail','${rid}')">${rid.replace(/-/g,' ')}</button>`).join('')}
      </div>
    </div>`:''}
  </div>`;
}

// ══ TIPS ════════════════════════════════════════════
function renderTips() {
  document.getElementById('tips-grid').innerHTML = TIPS.map(t=>`
    <div class="tip-card">
      <div class="tip-icon">${t.icon}</div>
      <div><div class="tip-title">${t.title}</div><div class="tip-text">${t.text}</div></div>
    </div>`).join('');
}

// ══ SEARCH ══════════════════════════════════════════
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
  techResults = TECHNIQUES.filter(t => t.name.toLowerCase().includes(query) || t.preview.toLowerCase().includes(query));
  tipResults = TIPS.filter(t => t.title.toLowerCase().includes(query) || t.text.toLowerCase().includes(query));
  const total = recipeResults.length + techResults.length + tipResults.length;
  document.getElementById('search-count').textContent = total;
  let html = '';
  if (recipeResults.length) html += `<div style="margin-bottom:2.5rem"><div class="section-eyebrow" style="margin-bottom:1.25rem">Recipes (${recipeResults.length})</div><div class="recipe-grid">${recipeResults.map(r=>recipeCardHTML(r)).join('')}</div></div>`;
  if (techResults.length) html += `<div style="margin-bottom:2.5rem"><div class="section-eyebrow" style="margin-bottom:1.25rem">Techniques (${techResults.length})</div><div class="technique-grid">${techResults.map(t=>`<div class="technique-card" onclick="navigate('technique-detail','${t.id}')"><div class="technique-icon">${t.icon}</div><div class="technique-title">${t.name}</div><div class="technique-preview">${t.preview}</div></div>`).join('')}</div></div>`;
  if (tipResults.length) html += `<div><div class="section-eyebrow" style="margin-bottom:1.25rem">Tips & Tricks (${tipResults.length})</div><div class="tips-grid">${tipResults.map(t=>`<div class="tip-card"><div class="tip-icon">${t.icon}</div><div><div class="tip-title">${t.title}</div><div class="tip-text">${t.text}</div></div></div>`).join('')}</div></div>`;
  if (!html) html = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Nothing found for "${q}"</div></div>`;
  document.getElementById('search-results-content').innerHTML = html;
  navigate('search');
}

// ══ ADMIN ════════════════════════════════════════════
function showAdminLogin() {
  document.getElementById('admin-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('admin-password').focus(), 100);
}

async function tryAdminLogin() {
  const pwd = document.getElementById('admin-password').value;
  const result = await apiLogin(pwd);
  if (result.token) {
    sessionStorage.setItem('admin_token', result.token);
    isAdmin = true;
    closeModal('admin-modal');
    document.getElementById('admin-toggle-btn').style.display = 'none';
    document.getElementById('admin-logout-btn').style.display = 'inline-block';
    document.getElementById('admin-badge-nav').style.display = 'inline-flex';
    document.getElementById('admin-password').value = '';
    showToast('✦ Admin mode enabled. Welcome, Saanji!');
    navigate(currentPage);
    // Check autofill mode availability
    apiGetAutofillMode().then(mode => {
      if (mode && !mode.claudeAvailable) {
        autofillMode = 'scraper';
        showToast('Note: No Claude API key found. Using web scraper for autofill.');
      }
    }).catch(() => {});
  } else {
    document.getElementById('admin-password').style.borderColor = 'var(--terracotta)';
    showToast('Incorrect password — try again.');
    setTimeout(() => { const el = document.getElementById('admin-password'); if (el) el.style.borderColor = ''; }, 2000);
  }
}

async function logoutAdmin() {
  await apiLogout();
  isAdmin = false;
  editingRecipeId = null;
  editingCreationId = null;
  document.getElementById('admin-toggle-btn').style.display = 'inline-block';
  document.getElementById('admin-logout-btn').style.display = 'none';
  document.getElementById('admin-badge-nav').style.display = 'none';
  navigate(currentPage);
  showToast('Logged out of admin mode.');
}

// ══ UTILS ════════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 3200);
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function closeModalOutside(e, id) { if (e.target.classList.contains('modal-overlay')) closeModal(id); }
function toggleMobileMenu() { document.getElementById('mobile-menu').classList.toggle('open'); }
function closeMobileMenu() { document.getElementById('mobile-menu').classList.remove('open'); }

// ══ INIT ════════════════════════════════════════════
const params = new URLSearchParams(window.location.search);
if (params.get('recipe')) navigate('recipe-detail', params.get('recipe'));
else navigate('home');
