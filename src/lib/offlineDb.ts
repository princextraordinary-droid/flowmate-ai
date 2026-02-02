// IndexedDB for offline-first data persistence
const DB_NAME = 'flowmate-offline';
const DB_VERSION = 1;

interface OfflineStore {
  tasks: IDBObjectStore;
  dailySyncs: IDBObjectStore;
  notes: IDBObjectStore;
  folders: IDBObjectStore;
  knowledgeItems: IDBObjectStore;
  syncQueue: IDBObjectStore;
}

let dbInstance: IDBDatabase | null = null;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Tasks store
      if (!db.objectStoreNames.contains('tasks')) {
        const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
        tasksStore.createIndex('user_id', 'user_id', { unique: false });
        tasksStore.createIndex('status', 'status', { unique: false });
      }

      // Daily syncs store
      if (!db.objectStoreNames.contains('dailySyncs')) {
        const syncsStore = db.createObjectStore('dailySyncs', { keyPath: 'id' });
        syncsStore.createIndex('user_id', 'user_id', { unique: false });
        syncsStore.createIndex('sync_date', 'sync_date', { unique: false });
      }

      // Notes store
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('user_id', 'user_id', { unique: false });
        notesStore.createIndex('folder_id', 'folder_id', { unique: false });
      }

      // Folders store
      if (!db.objectStoreNames.contains('folders')) {
        const foldersStore = db.createObjectStore('folders', { keyPath: 'id' });
        foldersStore.createIndex('user_id', 'user_id', { unique: false });
      }

      // Knowledge items store
      if (!db.objectStoreNames.contains('knowledgeItems')) {
        const itemsStore = db.createObjectStore('knowledgeItems', { keyPath: 'id' });
        itemsStore.createIndex('user_id', 'user_id', { unique: false });
        itemsStore.createIndex('note_id', 'note_id', { unique: false });
      }

      // Sync queue for pending operations
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('table_name', 'table_name', { unique: false });
        queueStore.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
};

// Generic CRUD operations
export const getAll = async <T>(storeName: string, userId?: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      let results = request.result as T[];
      if (userId) {
        results = results.filter((item: any) => item.user_id === userId);
      }
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getById = async <T>(storeName: string, id: string): Promise<T | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const put = async <T>(storeName: string, item: T): Promise<T> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
};

export const remove = async (storeName: string, id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Add to sync queue
export const addToSyncQueue = async (
  operation: 'create' | 'update' | 'delete',
  tableName: string,
  recordId: string,
  data: any
): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncQueue', 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.add({
      operation,
      table_name: tableName,
      record_id: recordId,
      data,
      created_at: new Date().toISOString(),
      synced: false
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Get pending sync operations
export const getPendingSyncOps = async (): Promise<any[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncQueue', 'readonly');
    const store = transaction.objectStore('syncQueue');
    const index = store.index('synced');
    const request = index.getAll(IDBKeyRange.only(false));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Mark sync operation as complete
export const markSynced = async (id: number): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncQueue', 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.synced = true;
        item.synced_at = new Date().toISOString();
        const putRequest = store.put(item);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// Clear synced items older than 24 hours
export const clearOldSyncedItems = async (): Promise<void> => {
  const db = await openDB();
  const items = await getPendingSyncOps();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncQueue', 'readwrite');
    const store = transaction.objectStore('syncQueue');

    items.forEach(item => {
      if (item.synced && item.synced_at < cutoff) {
        store.delete(item.id);
      }
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};
