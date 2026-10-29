/**
 * index.js — servidor Express que serve a API e os arquivos estáticos.
 *
 * Inicia com:  node server/index.js
 * Porta padrão: 3000  (alterar via variável PORT)
 */

const express = require('express');
const path    = require('path');
const { getDB } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// Inicializa o banco (cria schema se necessário)
getDB();

// ── MIDDLEWARE ────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));

// Bloqueia acesso a diretórios sensíveis
app.use((req, res, next) => {
  if (/^\/(server|node_modules|data|tests|Backup|\.git|\.vscode)(\/|$)/.test(req.path)) {
    return res.status(403).end();
  }
  next();
});

// ── API ───────────────────────────────────────────────────────────────────

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/transacoes', require('./routes/transacoes'));
app.use('/api/contas',     require('./routes/contas'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/utils',      require('./routes/utils'));

// ── ARQUIVOS ESTÁTICOS ────────────────────────────────────────────────────

const root = path.join(__dirname, '..');

app.use('/css', express.static(path.join(root, 'css')));
app.use('/js', express.static(path.join(root, 'js')));
app.use(express.static(root, { index: false }));

// Páginas HTML — login.html é a rota raiz
app.get('/', (req, res) => res.sendFile(path.join(root, 'login.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(root, 'login.html')));

// ── STARTUP ───────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  ┌─────────────────────────────────────────────┐`);
  console.log(`  │  Financeiro Fácil — Servidor Web             │`);
  console.log(`  │  http://localhost:${PORT}                       │`);
  console.log(`  └─────────────────────────────────────────────┘\n`);
});
