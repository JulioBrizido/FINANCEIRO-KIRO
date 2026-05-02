/**
 * db.js — camada de dados compartilhada (IndexedDB)
 * Banco: "financeiro" | Object Store: "transacoes"
 */

const DB_NAME    = 'financeiro';
const DB_VERSION = 1;
const STORE      = 'transacoes';

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('mesIdx',  'mesIdx',  { unique: false });
        store.createIndex('cartao',  'cartao',  { unique: false });
        store.createIndex('tipo',    'tipo',    { unique: false });
      }
    };

    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// ── CRUD ──────────────────────────────────────────────────────────────────

async function dbGetAll() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbAdd(transacao) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).add(transacao);
    req.onsuccess = e => resolve(e.target.result);   // retorna o id gerado
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbUpdate(transacao) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(transacao);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbDelete(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbClear() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

// ── EXPORT / IMPORT JSON ──────────────────────────────────────────────────

async function exportarJSON() {
  const dados = await dbGetAll();
  const blob  = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `financeiro_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importarJSON(arquivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const dados = JSON.parse(e.target.result);
        if (!Array.isArray(dados)) throw new Error('Formato inválido');
        for (const t of dados) {
          // Remove id para evitar conflito, deixa autoIncrement gerar novo
          const { id, ...sem } = t;
          await dbAdd(sem);
        }
        resolve(dados.length);
      } catch(err) { reject(err); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(arquivo);
  });
}
