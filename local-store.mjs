const DATABASE_NAME = 'floppy-local-workspace';
const DATABASE_VERSION = 1;
const SNAPSHOT_STORE = 'snapshots';
const SNAPSHOT_ID = 'projects';

export function localDatabaseAvailable() {
  return typeof globalThis.indexedDB !== 'undefined';
}

export function withSaveTime(snapshot, savedAt = Date.now()) {
  return JSON.stringify({ ...snapshot, savedAt });
}

export function savedAtFromSnapshot(raw) {
  try {
    const value = JSON.parse(raw);
    return Number.isFinite(Number(value?.savedAt)) ? Number(value.savedAt) : 0;
  } catch {
    return 0;
  }
}

function openDatabase() {
  if (!localDatabaseAvailable()) return Promise.reject(new Error('Local database is unavailable in this browser.'));
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open the local database.'));
  });
}

export async function loadLocalSnapshot() {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(SNAPSHOT_STORE, 'readonly').objectStore(SNAPSHOT_STORE).get(SNAPSHOT_ID);
      request.onsuccess = () => resolve(request.result?.raw || null);
      request.onerror = () => reject(request.error || new Error('Could not read the local database.'));
    });
  } finally {
    database.close();
  }
}

export async function saveLocalSnapshot(raw) {
  if (typeof raw !== 'string' || !raw) throw new Error('A local project snapshot is required.');
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const request = database.transaction(SNAPSHOT_STORE, 'readwrite').objectStore(SNAPSHOT_STORE).put({ id: SNAPSHOT_ID, raw, savedAt: savedAtFromSnapshot(raw) });
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error || new Error('Could not save the local database.'));
    });
  } finally {
    database.close();
  }
}
