/**
 * routes/contas.js — CRUD de contas/cartões do usuário autenticado.
 *
 * GET    /api/contas        → lista todas
 * POST   /api/contas        → cria uma
 * PUT    /api/contas/:id    → atualiza
 * DELETE /api/contas/:id    → exclui
 * POST   /api/contas/bulk    → cria várias (importação)
 * DELETE /api/contas        → exclui todas do usuário
 */

const express = require('express');
const { getDB, transaction } = require('../database');
const { requireAuth } = require('../middleware');

const router = express.Router();
router.use(requireAuth);

function clean(row) {
  if (Array.isArray(row)) return row.map(clean);
  if (!row) return row;
  const { user_id, ...rest } = row;
  return rest;
}

// ── LISTAR ────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM contas WHERE user_id = ? ORDER BY id').all(req.user.id);
  res.json(clean(rows));
});

// ── CRIAR ─────────────────────────────────────────────────────────────────

router.post('/', (req, res) => {
  const { nome, tipo = 'cartao', cor = '#94a3b8' } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });

  const db = getDB();
  const info = db.prepare('INSERT INTO contas (user_id, nome, tipo, cor) VALUES (?, ?, ?, ?)').run(
    req.user.id, nome, tipo, cor
  );
  res.status(201).json({ id: info.lastInsertRowid });
});

// ── CRIAR VÁRIAS (BULK) ───────────────────────────────────────────────────

router.post('/bulk', (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [];
  if (items.length === 0) return res.json({ count: 0 });

  const db = getDB();
  const stmt = db.prepare('INSERT INTO contas (user_id, nome, tipo, cor) VALUES (?, ?, ?, ?)');
  transaction(db, () => {
    for (const c of items) {
      stmt.run(req.user.id, c.nome || '', c.tipo || 'cartao', c.cor || '#94a3b8');
    }
  });
  res.status(201).json({ count: items.length });
});

// ── ATUALIZAR ─────────────────────────────────────────────────────────────

router.put('/:id', (req, res) => {
  const db = getDB();
  const { nome, tipo, cor } = req.body;
  const result = db.prepare('UPDATE contas SET nome = ?, tipo = ?, cor = ? WHERE id = ? AND user_id = ?').run(
    nome || '', tipo || 'cartao', cor || '#94a3b8', parseInt(req.params.id), req.user.id
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Conta não encontrada.' });
  res.json({ ok: true });
});

// ── EXCLUIR ───────────────────────────────────────────────────────────────

router.delete('/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM contas WHERE id = ? AND user_id = ?').run(
    parseInt(req.params.id), req.user.id
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Conta não encontrada.' });
  res.json({ ok: true });
});

// ── EXCLUIR TODAS ──────────────────────────────────────────────────────────

router.delete('/', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM contas WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
