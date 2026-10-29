/**
 * database.js — inicializa o banco SQLite via node:sqlite (built-in, sem
 * compilação nativa) e cria o schema.
 *
 * Usa DatabaseSync da API experimental node:sqlite do Node.js 22+.
 * Funcionalmente equivalente ao better-sqlite3 para este projeto.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'financeiro.db');

let _db = null;

function getDB() {
  if (_db) return _db;

  _db = new DatabaseSync(DB_PATH);

  // WAL mode + foreign keys
  _db.exec('PRAGMA journal_mode = WAL');
  _db.exec('PRAGMA foreign_keys = ON');

  // ── SCHEMA ──────────────────────────────────────────────────────────────

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT    NOT NULL,
      email     TEXT    NOT NULL UNIQUE,
      senha     TEXT    NOT NULL,          -- bcrypt hash
      criado_em TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transacoes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mov       TEXT    NOT NULL DEFAULT 'saida',
      cartao    TEXT    NOT NULL,
      ano       INTEGER,
      mesIdx    INTEGER NOT NULL,
      mes       TEXT    NOT NULL,
      descricao TEXT    NOT NULL,
      tipo      TEXT    NOT NULL,
      venc      TEXT,
      data      TEXT,
      valor     REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contas (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nome    TEXT    NOT NULL,
      tipo    TEXT    NOT NULL DEFAULT 'cartao',
      cor     TEXT    NOT NULL DEFAULT '#94a3b8'
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nome    TEXT    NOT NULL,
      mov     TEXT    NOT NULL DEFAULT 'saida',
      cor     TEXT    NOT NULL DEFAULT '#94a3b8'
    );

    CREATE INDEX IF NOT EXISTS idx_transacoes_user   ON transacoes(user_id);
    CREATE INDEX IF NOT EXISTS idx_transacoes_mesano ON transacoes(user_id, ano, mesIdx);
    CREATE INDEX IF NOT EXISTS idx_contas_user       ON contas(user_id);
    CREATE INDEX IF NOT EXISTS idx_categorias_user   ON categorias(user_id);
  `);

  return _db;
}

/**
 * Wrapper de transação — substitui db.transaction() do better-sqlite3.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Function} fn
 */
function transaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { getDB, transaction };
