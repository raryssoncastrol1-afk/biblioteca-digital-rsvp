/**
 * Gerenciador de Persistência Offline-First IndexedDB
 * Bancos: BibliotecaRSVP_DB e RSVP_Reader_Docs_DB
 */

const DB_METADATA_NAME = 'BibliotecaRSVP_DB';
const DB_DOCS_NAME = 'RSVP_Reader_Docs_DB';
const BASE_SAFE_VERSION = 10; // Versão alta para superar qualquer versão antiga existente (1, 2, etc.)

let metaDbInstance = null;
let docsDbInstance = null;

/**
 * Obtém a versão segura para abertura evitando qualquer VersionError
 */
async function getSafeVersion(dbName) {
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      const existing = dbs.find(d => d.name === dbName);
      if (existing && existing.version) {
        return Math.max(BASE_SAFE_VERSION, existing.version + 1);
      }
    }
  } catch (err) {
    console.warn('Não foi possível consultar indexedDB.databases():', err);
  }
  return BASE_SAFE_VERSION;
}

/**
 * Abertura resiliente de banco com criação de stores e auto-recuperação
 */
async function openResilientDB(dbName, setupFn) {
  const version = await getSafeVersion(dbName);

  return new Promise((resolve, reject) => {
    function tryOpen(targetVersion) {
      const request = indexedDB.open(dbName, targetVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        setupFn(db);
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
        };
        resolve(db);
      };

      request.onerror = () => {
        console.warn(`Erro ao abrir ${dbName} (v${targetVersion}):`, request.error);
        
        // Se ainda assim ocorrer VersionError, deleta o banco antigo e recria do zero
        if (request.error && request.error.name === 'VersionError') {
          console.warn(`Resetando ${dbName} para resolver VersionError definitivamente...`);
          const delRequest = indexedDB.deleteDatabase(dbName);
          delRequest.onsuccess = () => {
            const freshReq = indexedDB.open(dbName, BASE_SAFE_VERSION);
            freshReq.onupgradeneeded = (e) => setupFn(e.target.result);
            freshReq.onsuccess = () => resolve(freshReq.result);
            freshReq.onerror = () => reject(freshReq.error);
          };
          delRequest.onerror = () => reject(request.error);
        } else {
          reject(request.error);
        }
      };

      request.onblocked = () => {
        console.warn(`Abertura do banco ${dbName} bloqueada por outra aba.`);
      };
    }

    tryOpen(version);
  });
}

/**
 * Abre o banco de metadados
 */
export async function openMetadataDB() {
  if (metaDbInstance) return metaDbInstance;

  metaDbInstance = await openResilientDB(DB_METADATA_NAME, (db) => {
    if (!db.objectStoreNames.contains('books')) {
      const bookStore = db.createObjectStore('books', { keyPath: 'id' });
      bookStore.createIndex('format', 'format', { unique: false });
      bookStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    }
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' });
    }
  });

  return metaDbInstance;
}

/**
 * Abre o banco de documentos
 */
export async function openDocsDB() {
  if (docsDbInstance) return docsDbInstance;

  docsDbInstance = await openResilientDB(DB_DOCS_NAME, (db) => {
    if (!db.objectStoreNames.contains('documents')) {
      db.createObjectStore('documents', { keyPath: 'bookId' });
    }
  });

  return docsDbInstance;
}

/* ==================== MÉTODOS DE LIVROS E METADADOS ==================== */

// Fallback em memória caso IndexedDB falhe
const memoryStore = {
  books: new Map(),
  docs: new Map(),
  settings: new Map()
};

export async function getAllBooks() {
  try {
    const db = await openMetadataDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('books', 'readonly');
      const store = transaction.objectStore('books');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Fallback para armazenamento em memória (getAllBooks):', err);
    return Array.from(memoryStore.books.values());
  }
}

export async function getBookById(id) {
  try {
    const db = await openMetadataDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('books', 'readonly');
      const store = transaction.objectStore('books');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || memoryStore.books.get(id));
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return memoryStore.books.get(id) || null;
  }
}

export async function saveBook(bookData) {
  memoryStore.books.set(bookData.id, bookData);
  try {
    const db = await openMetadataDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('books', 'readwrite');
      const store = transaction.objectStore('books');
      const request = store.put({
        ...bookData,
        updatedAt: Date.now()
      });
      request.onsuccess = () => resolve(bookData);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Fallback: livro salvo em memória temporária:', err);
    return bookData;
  }
}

export async function updateBookProgress(id, currentWordIndex, totalWords, currentWpm) {
  try {
    const db = await openMetadataDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('books', 'readwrite');
      const store = transaction.objectStore('books');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const book = getRequest.result || memoryStore.books.get(id);
        if (!book) return resolve(null);

        book.currentWordIndex = currentWordIndex;
        book.lastWpm = currentWpm || book.lastWpm;
        book.progressPercent = totalWords > 0 ? Math.min(100, Math.round((currentWordIndex / totalWords) * 100)) : 0;
        book.lastReadDate = Date.now();
        book.updatedAt = Date.now();

        memoryStore.books.set(id, book);
        const putRequest = store.put(book);
        putRequest.onsuccess = () => resolve(book);
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (err) {
    const book = memoryStore.books.get(id);
    if (book) {
      book.currentWordIndex = currentWordIndex;
      book.lastWpm = currentWpm || book.lastWpm;
      book.progressPercent = totalWords > 0 ? Math.min(100, Math.round((currentWordIndex / totalWords) * 100)) : 0;
      book.lastReadDate = Date.now();
      book.updatedAt = Date.now();
      memoryStore.books.set(id, book);
    }
    return book;
  }
}

export async function deleteBook(id) {
  memoryStore.books.delete(id);
  memoryStore.docs.delete(id);
  try {
    const metaDb = await openMetadataDB();
    const docsDb = await openDocsDB();

    await new Promise((resolve, reject) => {
      const tx = metaDb.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      const req = store.delete(id);
      req.onsuccess = resolve;
      req.onerror = () => reject(req.error);
    });

    await new Promise((resolve, reject) => {
      const tx = docsDb.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const req = store.delete(id);
      req.onsuccess = resolve;
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Exclusão em memória concluída com aviso:', err);
  }
  return true;
}

/* ==================== MÉTODOS DE DOCUMENTOS E TOKENS ==================== */

export async function saveDocumentContent(bookId, data) {
  memoryStore.docs.set(bookId, data);
  try {
    const db = await openDocsDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('documents', 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.put({
        bookId,
        ...data,
        updatedAt: Date.now()
      });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Fallback: documento salvo em memória:', err);
    return true;
  }
}

export async function getDocumentContent(bookId) {
  try {
    const db = await openDocsDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('documents', 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.get(bookId);
      request.onsuccess = () => resolve(request.result || memoryStore.docs.get(bookId));
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return memoryStore.docs.get(bookId) || null;
  }
}

/* ==================== CONFIGURAÇÕES DO USUÁRIO ==================== */

export async function getSetting(key, defaultValue = null) {
  const db = await openMetadataDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result ? request.result.value : defaultValue);
    request.onerror = () => reject(request.error);
  });
}

export async function setSetting(key, value) {
  const db = await openMetadataDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put({ key, value });

    request.onsuccess = () => resolve(value);
    request.onerror = () => reject(request.error);
  });
}
