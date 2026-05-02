/**
 * db.js — camada de dados compartilhada (IndexedDB)
 * Banco: "financeiro" v2
 * Stores: "transacoes" | "contas"
 */

const DB_NAME    = 'financeiro';
const DB_VERSION = 3;          // v3: adiciona store "categorias"
const STORE        = 'transacoes';
const STORE_CONTAS = 'contas';
const STORE_CATS   = 'categorias';

// Categorias padrão
const CATS_PADRAO = [
  // Saída
  { nome: 'Casa',         mov: 'saida',   cor: '#6c63ff' },
  { nome: 'Mercado',      mov: 'saida',   cor: '#22c55e' },
  { nome: 'Restaurante',  mov: 'saida',   cor: '#ef4444' },
  { nome: 'Lazer',        mov: 'saida',   cor: '#f59e0b' },
  { nome: 'Saúde',        mov: 'saida',   cor: '#38bdf8' },
  { nome: 'Roupa',        mov: 'saida',   cor: '#06b6d4' },
  { nome: 'Carro',        mov: 'saida',   cor: '#64748b' },
  { nome: 'Padaria',      mov: 'saida',   cor: '#84cc16' },
  { nome: 'Silvia',       mov: 'saida',   cor: '#f472b6' },
  { nome: 'Letícia',      mov: 'saida',   cor: '#a78bfa' },
  { nome: 'Silvana',      mov: 'saida',   cor: '#fb923c' },
  { nome: 'Aventureiros', mov: 'saida',   cor: '#f97316' },
  { nome: 'Escola',       mov: 'saida',   cor: '#0ea5e9' },
  { nome: 'Festa',        mov: 'saida',   cor: '#ec4899' },
  { nome: 'Outros',       mov: 'saida',   cor: '#94a3b8' },
  // Entrada
  { nome: 'Salário',      mov: 'entrada', cor: '#22c55e' },
  { nome: 'Aluguel',      mov: 'entrada', cor: '#34d399' },
  { nome: 'Repasse',      mov: 'entrada', cor: '#6ee7b7' },
  { nome: 'Cartão Silvia',mov: 'entrada', cor: '#f472b6' },
  { nome: 'Letícia',      mov: 'entrada', cor: '#a78bfa' },
  { nome: 'Silvana',      mov: 'entrada', cor: '#fb923c' },
  { nome: 'Férias',       mov: 'entrada', cor: '#fbbf24' },
  { nome: 'Empréstimo',   mov: 'entrada', cor: '#94a3b8' },
  { nome: 'Outros',       mov: 'entrada', cor: '#64748b' },
];
const CONTAS_PADRAO = [
  { nome: 'Bradesco',  tipo: 'cartao',    cor: '#6c63ff' },
  { nome: 'Nubank',    tipo: 'cartao',    cor: '#f472b6' },
  { nome: 'Itaú',      tipo: 'cartao',    cor: '#f59e0b' },
  { nome: 'Carteira',  tipo: 'carteira',  cor: '#22c55e' },
  { nome: 'Fixo',      tipo: 'conta',     cor: '#94a3b8' },
];

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db      = e.target.result;
      const oldVer  = e.oldVersion;

      // Store de transações (v1)
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('mesIdx', 'mesIdx', { unique: false });
        store.createIndex('cartao', 'cartao', { unique: false });
        store.createIndex('tipo',   'tipo',   { unique: false });
      }

      // Store de contas (v2)
      if (!db.objectStoreNames.contains(STORE_CONTAS)) {
        db.createObjectStore(STORE_CONTAS, { keyPath: 'id', autoIncrement: true });
      }

      // Store de categorias (v3)
      if (!db.objectStoreNames.contains(STORE_CATS)) {
        db.createObjectStore(STORE_CATS, { keyPath: 'id', autoIncrement: true });
      }
    };

    req.onsuccess = async e => {
      const db = e.target.result;
      // Popula contas padrão se o store estiver vazio
      const contas = await _getAll(db, STORE_CONTAS);
      if (contas.length === 0) {
        for (const c of CONTAS_PADRAO) await _add(db, STORE_CONTAS, c);
      }
      // Popula categorias padrão se o store estiver vazio
      const cats = await _getAll(db, STORE_CATS);
      if (cats.length === 0) {
        for (const c of CATS_PADRAO) await _add(db, STORE_CATS, c);
      }
      resolve(db);
    };

    req.onerror = e => reject(e.target.error);
  });
}

// ── helpers internos (recebem db já aberto) ───────────────────────────────

function _getAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function _add(db, store, obj) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(obj);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// ── CRUD TRANSAÇÕES ───────────────────────────────────────────────────────

async function dbGetAll() {
  const db = await abrirDB();
  return _getAll(db, STORE);
}

async function dbAdd(transacao) {
  const db = await abrirDB();
  return _add(db, STORE, transacao);
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

// ── CRUD CONTAS ───────────────────────────────────────────────────────────

async function contasGetAll() {
  const db = await abrirDB();
  return _getAll(db, STORE_CONTAS);
}

async function contasAdd(conta) {
  const db = await abrirDB();
  return _add(db, STORE_CONTAS, conta);
}

async function contasUpdate(conta) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_CONTAS, 'readwrite');
    const req = tx.objectStore(STORE_CONTAS).put(conta);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function contasDelete(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_CONTAS, 'readwrite');
    const req = tx.objectStore(STORE_CONTAS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

// ── CRUD CATEGORIAS ───────────────────────────────────────────────────────

async function catsGetAll() {
  const db = await abrirDB();
  return _getAll(db, STORE_CATS);
}

async function catsAdd(cat) {
  const db = await abrirDB();
  return _add(db, STORE_CATS, cat);
}

async function catsUpdate(cat) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_CATS, 'readwrite');
    const req = tx.objectStore(STORE_CATS).put(cat);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function catsDelete(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_CATS, 'readwrite');
    const req = tx.objectStore(STORE_CATS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

// ── EXPORT / IMPORT JSON ──────────────────────────────────────────────────

async function exportarJSON() {
  const dados  = await dbGetAll();
  const contas = await contasGetAll();
  const cats   = await catsGetAll();
  const payload = { transacoes: dados, contas, categorias: cats };
  const blob  = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
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
        const raw = JSON.parse(e.target.result);
        const transacoes  = Array.isArray(raw) ? raw : (raw.transacoes  || []);
        const contas      = Array.isArray(raw) ? []  : (raw.contas      || []);
        const categorias  = Array.isArray(raw) ? []  : (raw.categorias  || []);

        for (const t of transacoes)  { const { id, ...s } = t; await dbAdd(s); }
        for (const c of contas)      { const { id, ...s } = c; await contasAdd(s); }
        for (const c of categorias)  { const { id, ...s } = c; await catsAdd(s); }

        resolve({ transacoes: transacoes.length, contas: contas.length, categorias: categorias.length });
      } catch(err) { reject(err); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(arquivo);
  });
}
