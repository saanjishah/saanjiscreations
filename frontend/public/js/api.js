// api.js — All backend API calls live here

const API_BASE = '/api';

// ── Auth ────────────────────────────────────────────────────────────────────

async function apiLogin(password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return res.json();
}

async function apiLogout() {
  const token = sessionStorage.getItem('admin_token');
  if (!token) return;
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  sessionStorage.removeItem('admin_token');
}

function getAuthHeaders() {
  const token = sessionStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Recipes ──────────────────────────────────────────────────────────────────

async function apiGetRecipes(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/recipes${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error('Failed to load recipes');
  return res.json();
}

async function apiGetRecipe(id) {
  const res = await fetch(`${API_BASE}/recipes/${id}`);
  if (!res.ok) throw new Error('Recipe not found');
  return res.json();
}

async function apiCreateRecipe(formData) {
  const res = await fetch(`${API_BASE}/recipes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData, // FormData (multipart, includes optional photo)
  });
  return res.json();
}

async function apiUpdateRecipe(id, formData) {
  const res = await fetch(`${API_BASE}/recipes/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: formData,
  });
  return res.json();
}

async function apiDeleteRecipe(id) {
  const res = await fetch(`${API_BASE}/recipes/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  return res.json();
}

// ── Creations ─────────────────────────────────────────────────────────────────

async function apiGetCreations(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/creations${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error('Failed to load creations');
  return res.json();
}

async function apiCreateCreation(formData) {
  const res = await fetch(`${API_BASE}/creations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  return res.json();
}

async function apiUpdateCreation(id, formData) {
  const res = await fetch(`${API_BASE}/creations/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: formData,
  });
  return res.json();
}

async function apiDeleteCreation(id) {
  const res = await fetch(`${API_BASE}/creations/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  });
  return res.json();
}

// ── Autofill ──────────────────────────────────────────────────────────────────

async function apiAutofill(url, mode) {
  const res = await fetch(`${API_BASE}/autofill`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, mode }),
  });
  return res.json();
}

async function apiGetAutofillMode() {
  const res = await fetch(`${API_BASE}/autofill/mode`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}
