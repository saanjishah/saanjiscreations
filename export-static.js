#!/usr/bin/env node
/**
 * export-static.js
 * Builds a static GitHub Pages version of Saanji's Creations.
 *
 * Usage:
 *   node export-static.js                                         (auto-detects URL from git remote)
 *   node export-static.js https://saanjishah.github.io/saanjiscreations   (explicit URL)
 *
 * Output: ./docs/ — commit and push, then enable GitHub Pages → /docs
 */

const fs        = require('fs');
const path      = require('path');
const { execSync } = require('child_process');

const ROOT     = __dirname;
const DOCS     = path.join(ROOT, 'docs');
const FRONTEND = path.join(ROOT, 'frontend', 'public');
const DATA     = path.join(ROOT, 'data');

// ── Determine canonical site URL ─────────────────────────────────────────────
// Priority: CLI arg → auto-detect from git remote → fallback placeholder
function detectSiteUrl() {
  // 1. Explicit CLI argument
  const arg = process.argv[2];
  if (arg && arg.startsWith('http')) return arg.replace(/\/$/, '');

  // 2. Auto-detect from git remote
  try {
    const remote = execSync('git remote get-url origin', { cwd: ROOT }).toString().trim();
    // Handles: https://github.com/user/repo.git  or  git@github.com:user/repo.git
    const match = remote.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/);
    if (match) {
      const [, user, repo] = match;
      // user.github.io repos serve from root; all others serve from /repo-name/
      const isUserSite = repo.toLowerCase() === `${user.toLowerCase()}.github.io`;
      return isUserSite
        ? `https://${user}.github.io`
        : `https://${user}.github.io/${repo}`;
    }
  } catch { /* no git remote */ }

  // 3. Fallback
  return 'https://YOUR-USERNAME.github.io/YOUR-REPO-NAME';
}

const SITE_URL = detectSiteUrl();
console.log(`\n🌐 Site URL: ${SITE_URL}`);

// ── Sanity checks ─────────────────────────────────────────────────────────────
console.log('\n🔍 Diagnostics:');
console.log('   Project root :', ROOT);
console.log('   Data folder  :', DATA, fs.existsSync(DATA) ? '✓' : '✗ MISSING');

const recipeFile    = path.join(DATA, 'recipes.json');
const creationFile  = path.join(DATA, 'creations.json');
const techniqueFile = path.join(DATA, 'techniques.json');
const tipsFile      = path.join(DATA, 'tips.json');

console.log('   recipes.json    :', fs.existsSync(recipeFile)    ? '✓ found' : '✗ MISSING — run npm run setup first');
console.log('   creations.json  :', fs.existsSync(creationFile)  ? '✓ found' : '✗ MISSING');
console.log('   techniques.json :', fs.existsSync(techniqueFile) ? '✓ found' : '✗ MISSING (will use defaults)');
console.log('   tips.json       :', fs.existsSync(tipsFile)      ? '✓ found' : '✗ MISSING (will use defaults)');

if (!fs.existsSync(recipeFile)) {
  console.error('\n❌ data/recipes.json not found. Run  npm run setup  first.\n');
  process.exit(1);
}

// ── Load data ─────────────────────────────────────────────────────────────────
function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (e) { console.error('   ⚠ Could not parse', filePath, ':', e.message); return fallback; }
}
function loadDefault(key) {
  try { return require('./backend/default-data')[key]; } catch { return []; }
}

const recipes    = loadJson(recipeFile,    []);
const creations  = loadJson(creationFile,  []);
const techniques = fs.existsSync(techniqueFile) ? loadJson(techniqueFile, []) : loadDefault('TECHNIQUES');
const tips       = fs.existsSync(tipsFile)      ? loadJson(tipsFile, [])      : loadDefault('TIPS');

// Strip leading slash from photo paths so they're relative in static export
function fixPhotos(items) {
  return items.map(i => ({ ...i, photo: i.photo ? i.photo.replace(/^\//, '') : null }));
}

console.log(`\n📦 Data: ${recipes.length} recipes · ${creations.length} creations · ${techniques.length} techniques · ${tips.length} tips`);
if (recipes.length === 0) console.warn('   ⚠  recipes.json is empty — did you add recipes via npm run dev?');

// ── Clean & recreate docs/ ────────────────────────────────────────────────────
console.log('\n🏗  Building docs/...');
if (fs.existsSync(DOCS)) fs.rmSync(DOCS, { recursive: true });
['js', 'css', 'uploads/recipes', 'uploads/creations'].forEach(d =>
  fs.mkdirSync(path.join(DOCS, d), { recursive: true })
);

// ── Copy uploads & CSS ────────────────────────────────────────────────────────
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach(e => {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  });
}
copyDir(path.join(FRONTEND, 'uploads'), path.join(DOCS, 'uploads'));
fs.copyFileSync(path.join(FRONTEND, 'css', 'main.css'), path.join(DOCS, 'css', 'main.css'));
console.log('   ✓ Copied uploads + CSS');

// ── Generate static api.js — all data embedded, SITE_URL hardcoded ───────────
const staticApiJs = `// api.js — STATIC MODE (GitHub Pages export — generated by npm run export)
// Data is embedded. SITE_URL is baked in at export time. Writes are disabled.

const _SITE_URL = ${JSON.stringify(SITE_URL)};
const _R = ${JSON.stringify(fixPhotos(recipes))};
const _C = ${JSON.stringify(fixPhotos(creations))};
const _T = ${JSON.stringify(techniques)};
const _P = ${JSON.stringify(tips)};

function getAuthHeaders() { return {}; }
window.getAuthHeaders = getAuthHeaders;
window._SITE_URL = _SITE_URL;
window._STATIC_TECHNIQUES_READY = _T;
window._STATIC_TIPS_READY = _P;

async function apiLogin()   { return { error: 'Admin is not available in static mode.' }; }
async function apiLogout()  {}

async function apiGetRecipes(params = {}) {
  let r = [..._R];
  if (params.category && params.category !== 'all') r = r.filter(x => x.category === params.category);
  if (params.q) {
    const q = params.q.toLowerCase();
    r = r.filter(x =>
      x.name.toLowerCase().includes(q) ||
      (x.description || '').toLowerCase().includes(q) ||
      (x.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  return r;
}
async function apiGetRecipe(id) {
  const r = _R.find(x => x.id === id);
  if (!r) throw new Error('Recipe not found');
  return r;
}
async function apiCreateRecipe()   { alert('Admin editing is disabled on the public site. Use npm run dev locally to add recipes.'); throw new Error('Static mode'); }
async function apiUpdateRecipe()   { throw new Error('Static mode'); }
async function apiDeleteRecipe()   { throw new Error('Static mode'); }
async function apiGetCreations(params = {}) {
  let c = [..._C];
  if (params.event && params.event !== 'all') c = c.filter(x => x.event === params.event);
  return c;
}
async function apiCreateCreation() { alert('Admin editing is disabled on the public site.'); throw new Error('Static mode'); }
async function apiUpdateCreation() { throw new Error('Static mode'); }
async function apiDeleteCreation() { throw new Error('Static mode'); }
async function apiAutofill()       { throw new Error('Static mode'); }
async function apiGetAutofillMode() { return { claudeAvailable: false, scraperAvailable: false, currentMode: 'none' }; }
`;

fs.writeFileSync(path.join(DOCS, 'js', 'api.js'), staticApiJs);
console.log(`   ✓ Generated api.js (SITE_URL = ${SITE_URL})`);

// ── Patch data.js — inject static overrides ───────────────────────────────────
let dataJs = fs.readFileSync(path.join(FRONTEND, 'js', 'data.js'), 'utf8');
dataJs += `
if (window._STATIC_TECHNIQUES_READY && window._STATIC_TECHNIQUES_READY.length) {
  TECHNIQUES.length = 0; window._STATIC_TECHNIQUES_READY.forEach(t => TECHNIQUES.push(t));
}
if (window._STATIC_TIPS_READY && window._STATIC_TIPS_READY.length) {
  TIPS.length = 0; window._STATIC_TIPS_READY.forEach(t => TIPS.push(t));
}
`;
fs.writeFileSync(path.join(DOCS, 'js', 'data.js'), dataJs);
console.log('   ✓ Patched data.js');

// ── Patch app.js — replace shareRecipe to use hardcoded SITE_URL ──────────────
let appJs = fs.readFileSync(path.join(FRONTEND, 'js', 'app.js'), 'utf8');

// Replace the shareRecipe function with a version that uses window._SITE_URL
appJs = appJs.replace(
  /function shareRecipe\(type\) \{[\s\S]*?\n\}/,
  `function shareRecipe(type) {
  const dd = document.getElementById('share-dropdown');
  if (dd) dd.style.display = 'none';
  if (type === 'link' && currentRecipe) {
    // Use the hardcoded SITE_URL baked in at export time — always correct
    const base = (window._SITE_URL || location.origin).replace(/\\/$/, '');
    const url = base + '/?recipe=' + currentRecipe.id;
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast('🔗 Link copied to clipboard!');
    return;
  }
  if (type === 'pdf') { window.print(); return; }
  showToast('Shared!');
}`
);

fs.writeFileSync(path.join(DOCS, 'js', 'app.js'), appJs);
console.log('   ✓ Patched app.js (share link uses baked-in SITE_URL)');

// ── Build index.html ──────────────────────────────────────────────────────────
let html = fs.readFileSync(path.join(FRONTEND, 'index.html'), 'utf8');

// Add <base> tag for subdirectory path resolution
html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n<base href="./">');

// Strip leading slashes from asset paths
html = html.replace(/href="\/css\//g,    'href="css/');
html = html.replace(/src="\/js\//g,      'src="js/');
html = html.replace(/src="\/uploads\//g, 'src="uploads/');

// Hide admin button
html = html.replace(
  /<button id="admin-toggle-btn"[^>]*>Admin<\/button>/,
  `<span style="font-size:0.7rem;color:var(--text-light);letter-spacing:0.08em;text-transform:uppercase;padding:0.4rem 0.5rem">View only</span>`
);

fs.writeFileSync(path.join(DOCS, 'index.html'), html);
console.log('   ✓ Generated index.html');

// ── Summary ───────────────────────────────────────────────────────────────────
const allFiles = [];
function listFiles(dir, prefix = '') {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    e.isDirectory()
      ? listFiles(path.join(dir, e.name), prefix + e.name + '/')
      : allFiles.push(prefix + e.name);
  });
}
listFiles(DOCS);
console.log(`\n📁 docs/ (${allFiles.length} files):`);
allFiles.forEach(f => console.log('   ' + f));

console.log(`
✅ Export complete → ./docs/

  Share links will use: ${SITE_URL}/?recipe=<id>

Push to GitHub:
  git add docs/ data/
  git commit -m "Update site"
  git push
`);
