/**
 * routes/config.js — armazenamento chave/valor por usuário.
 * Usado pela Conferência Mensal para persistir os checkboxes.
 *
 * GET /api/config/:chave   → { valor: string | null }
 * PUT /api/config/:chave   → body: { valor: string }  → { ok: true }
 */

const express = require('express');
const { getDB } = require('../database');
const { requireAuth } = require('../middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/:chave', (req, res) => {
  const db  = getDB();
  const row = db.prepare('SELECT valor FROM config WHERE user_id = ? AND chave = ?')
                .get(req.user.id, req.params.chave);
  res.json({ valor: row ? row.valor : null });
});

router.put('/:chave', (req, res) => {
  const db    = getDB();
  const valor = req.body.valor != null ? String(req.body.valor) : null;
  db.prepare('INSERT OR REPLACE INTO config (user_id, chave, valor) VALUES (?, ?, ?)')
    .run(req.user.id, req.params.chave, valor);
  res.json({ ok: true });
});

module.exports = router;
