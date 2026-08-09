/**
 * config.js — Controller da aba Configurações (config.html)
 * Depende de: db.js, js/ui.js
 */

const TIPO_LABEL = { cartao: '💳 Cartão', carteira: '👛 Carteira', conta: '🏦 Conta', outro: '📁 Outro' };

let editandoId    = null;
let catEditandoId = null;

// ── CONTAS — FORM ─────────────────────────────────────────────────────────

function limparForm() {
  editandoId = null;
  document.getElementById('formTitle').textContent = 'Nova Conta / Cartão';
  document.getElementById('fNome').value  = '';
  document.getElementById('fTipo').value  = 'cartao';
  document.getElementById('fCor').value   = '#6c63ff';
  document.getElementById('btnCancelar').style.display = 'none';
}

async function salvar() {
  const nome = document.getElementById('fNome').value.trim();
  const tipo = document.getElementById('fTipo').value;
  const cor  = document.getElementById('fCor').value;
  if (!nome) return toast('Informe o nome da conta.', true);
  const todas = await contasGetAll();
  const dup = todas.find(c => c.nome.toLowerCase() === nome.toLowerCase() && c.id !== editandoId);
  if (dup) return toast('Já existe uma conta com esse nome.', true);
  if (editandoId !== null) { await contasUpdate({ id: editandoId, nome, tipo, cor }); toast('Conta atualizada!'); }
  else { await contasAdd({ nome, tipo, cor }); toast('Conta adicionada!'); }
  limparForm();
  await renderLista();
}

async function editar(id) {
  const todas = await contasGetAll();
  const c = todas.find(x => x.id === id);
  if (!c) return;
  editandoId = id;
  document.getElementById('formTitle').textContent = '✏️ Editar: ' + c.nome;
  document.getElementById('fNome').value = c.nome;
  document.getElementById('fTipo').value = c.tipo;
  document.getElementById('fCor').value  = c.cor || '#6c63ff';
  document.getElementById('btnCancelar').style.display = 'inline-block';
  document.querySelectorAll('.conta-item').forEach(el => el.classList.toggle('editando', parseInt(el.dataset.id) === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function excluir(id, nome) {
  abrirModal('Excluir conta', 'Excluir "' + nome + '"? Os lançamentos não serão apagados.',
    async () => { await contasDelete(id); toast('"' + nome + '" removida.'); if (editandoId === id) limparForm(); await renderLista(); });
}

async function renderLista() {
  const contas = await contasGetAll();
  const el = document.getElementById('contaList');
  if (contas.length === 0) { el.innerHTML = '<p style="color:var(--muted);font-size:.9rem">Nenhuma conta cadastrada.</p>'; return; }
  el.innerHTML = contas.map(c => {
    const label = TIPO_LABEL[c.tipo] || c.tipo;
    const cor   = c.cor || '#94a3b8';
    return '<div class="conta-item" data-id="' + c.id + '">' +
      '<div class="conta-dot" style="background:' + cor + '"></div>' +
      '<span class="conta-nome">' + c.nome + '</span>' +
      '<span class="conta-tipo">' + label + '</span>' +
      '<button class="btn-icon" title="Editar"  onclick="editar(' + c.id + ')">✏️</button>' +
      '<button class="btn-icon" title="Excluir" onclick="excluir(' + c.id + ', \'' + c.nome.replace(/'/g,"\\'") + '\')">🗑️</button>' +
    '</div>';
  }).join('');
}

// ── CATEGORIAS ────────────────────────────────────────────────────────────

function catLimparForm() {
  catEditandoId = null;
  document.getElementById('catFormTitle').textContent = 'Nova Categoria';
  document.getElementById('cNome').value = '';
  document.getElementById('cMov').value  = 'saida';
  document.getElementById('cCor').value  = '#6c63ff';
  document.getElementById('catBtnCancelar').style.display = 'none';
  document.querySelectorAll('.conta-item[data-cat-id]').forEach(el => el.classList.remove('editando'));
}

async function catSalvar() {
  const nome = document.getElementById('cNome').value.trim();
  const mov  = document.getElementById('cMov').value;
  const cor  = document.getElementById('cCor').value;
  if (!nome) return toast('Informe o nome da categoria.', true);
  const todas = await catsGetAll();
  const dup = todas.find(c => c.nome.toLowerCase() === nome.toLowerCase() && c.mov === mov && c.id !== catEditandoId);
  if (dup) return toast('Já existe essa categoria para ' + (mov === 'saida' ? 'Saída' : 'Entrada') + '.', true);
  if (catEditandoId !== null) { await catsUpdate({ id: catEditandoId, nome, mov, cor }); toast('Categoria atualizada!'); }
  else { await catsAdd({ nome, mov, cor }); toast('Categoria adicionada!'); }
  catLimparForm();
  await renderCats();
}

async function catEditar(id) {
  const todas = await catsGetAll();
  const c = todas.find(x => x.id === id);
  if (!c) return;
  catEditandoId = id;
  document.getElementById('catFormTitle').textContent = '✏️ Editar: ' + c.nome;
  document.getElementById('cNome').value = c.nome;
  document.getElementById('cMov').value  = c.mov;
  document.getElementById('cCor').value  = c.cor || '#6c63ff';
  document.getElementById('catBtnCancelar').style.display = 'inline-block';
  document.querySelectorAll('.conta-item[data-cat-id]').forEach(el => el.classList.toggle('editando', parseInt(el.dataset.catId) === id));
  document.getElementById('catFormTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function catExcluir(id, nome) {
  abrirModal('Excluir categoria', 'Excluir "' + nome + '"? Os lançamentos não serão apagados.',
    async () => { await catsDelete(id); toast('"' + nome + '" removida.'); if (catEditandoId === id) catLimparForm(); await renderCats(); });
}

function renderCatItem(c) {
  const cor = c.cor || '#94a3b8';
  const nomeEsc = c.nome.replace(/'/g, "\\'");
  return '<div class="conta-item" data-cat-id="' + c.id + '">' +
    '<div class="conta-dot" style="background:' + cor + '"></div>' +
    '<span class="conta-nome">' + c.nome + '</span>' +
    '<button class="btn-icon" title="Editar"  onclick="catEditar(' + c.id + ')">✏️</button>' +
    '<button class="btn-icon" title="Excluir" onclick="catExcluir(' + c.id + ', \'' + nomeEsc + '\')">🗑️</button>' +
  '</div>';
}

async function renderCats() {
  const todas = await catsGetAll();
  const elS = document.getElementById('catListSaida');
  const elE = document.getElementById('catListEntrada');
  const saidas   = todas.filter(c => c.mov === 'saida');
  const entradas = todas.filter(c => c.mov === 'entrada');
  elS.innerHTML = saidas.length   ? saidas.map(renderCatItem).join('')   : '<p style="color:var(--muted);font-size:.9rem">Nenhuma categoria de saída.</p>';
  elE.innerHTML = entradas.length ? entradas.map(renderCatItem).join('') : '<p style="color:var(--muted);font-size:.9rem">Nenhuma categoria de entrada.</p>';
}

function confirmarRestaurarPadroes() {
  abrirModal('Restaurar padrões', 'Isso vai substituir todas as contas e categorias atuais pelas padrão do sistema.',
    async () => { await restaurarPadroes(); toast('Contas e categorias padrão restauradas!'); await renderLista(); await renderCats(); });
}

// ── INIT ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const vEl = document.getElementById('navVersion');
  if (vEl) vEl.textContent = 'v' + (window.appVersion || '2.0.1');
  renderLista();
  renderCats();
});
