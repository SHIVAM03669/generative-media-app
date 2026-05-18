import { normalizeGeneration } from '../models/generation.js';

const STORAGE_KEY = 'gencanvas:v1';
const DB_NAME = 'gencanvas';
const DB_VERSION = 1;
const IDB_STORE = 'generations';

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, generations: [] };
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version ?? 1,
      generations: (parsed.generations ?? [])
        .map(normalizeGeneration)
        .filter(Boolean),
    };
  } catch {
    return { version: 1, generations: [] };
  }
}

function writeStore(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Try to free up space by cleaning old preview data
      const cleaned = cleanupStorageData(data);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      } catch (secondError) {
        if (secondError.name === 'QuotaExceededError') {
          // If still failing, remove oldest generations
          const furtherCleaned = removeOldestGenerations(cleaned);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(furtherCleaned));
        } else {
          throw secondError;
        }
      }
    } else {
      throw error;
    }
  }
}

function cleanupStorageData(data) {
  const cleaned = { ...data };
  cleaned.generations = data.generations.map(generation => {
    // Keep preview data for recent items (last 10) and remove for older ones
    const recentCount = 10;
    const sortedByDate = [...data.generations].sort((a, b) => b.updatedAt - a.updatedAt);
    const isRecent = sortedByDate.slice(0, recentCount).some(g => g.id === generation.id);
    
    if (!isRecent && generation.canvasTweak?.previewDataUrl) {
      return {
        ...generation,
        canvasTweak: {
          ...generation.canvasTweak,
          previewDataUrl: undefined // Remove large preview data
        }
      };
    }
    return generation;
  });
  return cleaned;
}

function removeOldestGenerations(data, keepCount = 50) {
  const cleaned = { ...data };
  // Sort by updatedAt and keep only the most recent items
  const sorted = [...data.generations].sort((a, b) => b.updatedAt - a.updatedAt);
  cleaned.generations = sorted.slice(0, keepCount);
  return cleaned;
}

/** One-time migration from legacy IndexedDB. */
async function migrateFromIndexedDb() {
  if (typeof indexedDB === 'undefined') return [];
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => resolve([]);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        resolve([]);
        return;
      }
      const tx = db.transaction(IDB_STORE, 'readonly');
      const getAll = tx.objectStore(IDB_STORE).getAll();
      getAll.onsuccess = () => {
        const items = (getAll.result ?? []).map((g, i) =>
          normalizeGeneration({
            ...g,
            displayIndex: g.displayIndex ?? i + 1,
            status: g.status ?? (g.imageUrl ? 'done' : 'failed'),
            updatedAt: g.updatedAt ?? g.createdAt,
          })
        );
        resolve(items.filter(Boolean));
      };
      getAll.onerror = () => resolve([]);
    };
  });
}

function assignDisplayIndices(items) {
  const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
  const map = new Map(sorted.map((g, i) => [g.id, i + 1]));
  return items.map((g) => ({
    ...g,
    displayIndex: g.displayIndex > 0 ? g.displayIndex : map.get(g.id) ?? 0,
  }));
}

export async function loadGenerations() {
  const store = readStore();
  if (store.generations.length > 0) {
    const withIndices = assignDisplayIndices(store.generations);
    return withIndices.sort((a, b) => b.createdAt - a.createdAt);
  }

  const legacy = await migrateFromIndexedDb();
  if (legacy.length > 0) {
    writeStore({ version: 1, generations: legacy });
    return legacy.sort((a, b) => b.createdAt - a.createdAt);
  }

  return [];
}

export async function saveGeneration(item) {
  const store = readStore();
  const normalized = normalizeGeneration({ ...item, updatedAt: Date.now() });
  const idx = store.generations.findIndex((g) => g.id === normalized.id);
  if (idx >= 0) store.generations[idx] = normalized;
  else store.generations.push(normalized);
  writeStore(store);
  return normalized;
}

export async function updateGeneration(id, patch) {
  const store = readStore();
  const existing = store.generations.find((g) => g.id === id);
  if (!existing) return null;
  const updated = normalizeGeneration({
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  });
  const idx = store.generations.findIndex((g) => g.id === id);
  store.generations[idx] = updated;
  writeStore(store);
  return updated;
}

export async function deleteGeneration(id) {
  const store = readStore();
  store.generations = store.generations.filter((g) => g.id !== id);
  writeStore(store);
}

export function getStorageKey() {
  return STORAGE_KEY;
}

export function getStorageInfo() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const sizeInBytes = new Blob([data || '']).size;
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    
    // Estimate localStorage usage (rough approximation)
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    return {
      gencanvasSize: `${sizeInMB} MB`,
      totalStorageSize: `${totalSizeMB} MB`,
      itemCount: readStore().generations.length
    };
  } catch (error) {
    return {
      gencanvasSize: 'Unknown',
      totalStorageSize: 'Unknown',
      itemCount: 0,
      error: error.message
    };
  }
}

export async function clearOldPreviews() {
  const store = readStore();
  const cleaned = cleanupStorageData(store);
  writeStore(cleaned);
  return cleaned.generations.length;
}
