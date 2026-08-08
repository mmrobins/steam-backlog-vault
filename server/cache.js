const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'cache_store.json');
let store = {};

// Load cache from disk on startup
try {
  if (fs.existsSync(CACHE_FILE)) {
    const data = fs.readFileSync(CACHE_FILE, 'utf8');
    store = JSON.parse(data);
  }
} catch (err) {
  console.warn('[Cache] Failed to load cache file, starting fresh:', err.message);
  store = {};
}

// Debounced save to disk to avoid heavy I/O
let saveTimeout = null;
function queueSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), 'utf8');
    } catch (err) {
      console.error('[Cache] Failed to save cache to disk:', err.message);
    }
  }, 1000);
}

module.exports = {
  get(key) {
    const item = store[key];
    if (!item) return undefined;
    
    // Check expiration (standard TTL of 14 days)
    if (item.expiresAt && Date.now() > item.expiresAt) {
      delete store[key];
      queueSave();
      return undefined;
    }
    return item.value;
  },

  set(key, value, ttlSeconds = 1209600) { // Default 14 days
    store[key] = {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    };
    queueSave();
  }
};
