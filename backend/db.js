/**
 * db.js — Simple JSON flat-file database
 * Reads/writes JSON files in /data/
 * Each collection is a single JSON file: data/recipes.json, data/creations.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/**
 * Read a collection from disk.
 * @param {string} name - Collection name (e.g. 'recipes')
 * @returns {Array}
 */
function read(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Write a collection to disk (pretty-printed for readability).
 * @param {string} name
 * @param {Array} data
 */
function write(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Find one item by id.
 */
function findById(name, id) {
  return read(name).find(item => item.id === id) || null;
}

/**
 * Insert a new item. Automatically adds createdAt timestamp.
 */
function insert(name, item) {
  const collection = read(name);
  const newItem = { ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  collection.push(newItem);
  write(name, collection);
  return newItem;
}

/**
 * Update an item by id. Merges provided fields.
 */
function update(name, id, fields) {
  const collection = read(name);
  const idx = collection.findIndex(item => item.id === id);
  if (idx === -1) return null;
  collection[idx] = { ...collection[idx], ...fields, updatedAt: new Date().toISOString() };
  write(name, collection);
  return collection[idx];
}

/**
 * Delete an item by id.
 */
function remove(name, id) {
  const collection = read(name);
  const idx = collection.findIndex(item => item.id === id);
  if (idx === -1) return false;
  collection.splice(idx, 1);
  write(name, collection);
  return true;
}

module.exports = { read, write, findById, insert, update, remove };