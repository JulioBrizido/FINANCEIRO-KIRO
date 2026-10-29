/**
 * lancamentos.js — Controller da aba Lançamentos (index.html)
 * Depende de: db.js, js/utils.browser.js, js/ui.js
 */

// ── CACHE ─────────────────────────────────────────────────────────────────

let _cats   = [];
let _contas = [];
let editandoId = null;

async function carregarCats() {
  _cats = await catsGetAll();
}

function corTipo(tipo, mov) {
  const cat = _cats.find(c => c.nome === tipo && c.mov === mov)
           || _cats.find(c => c.nome === tipo);
  return cat ? cat.cor : '#94a3b8';
}

async function carregarContas() {
  _contas = await contasGetAll();
  const sel = document.getElementById('fCartao');
  const valAtual = sel.value;
  sel.innerHTML = _contas.map(c =>
    '<option value="' + c.nome + '"' + (c.nome === valAtual ? ' selected' : '') + '>' + c.nome + '</option>'
  ).join('');
  const filtro = document.getElementById('filtroCartao');
  const filtroAtual = filtro.value;
  filtro.innerHTML = '<option value="todos">Todos</option>' +
    _contas.map(c =>
      '<option value="' + c.nome + '"' + (c.nome === filtroAtual ? ' selected' : '') + '>' + c.nome + '</option>'
    ).join('');
}

function contaNome(mov) {
  if (mov === 'entrada') {
    const c = _contas.find(c => c.tipo === 'carteira' || c.tipo === 'conta') || _contas[0];
    return c ? c.nome : '';
  }
  const c = _contas.find(c => c.tipo === 'cartao') || _contas[0];
  return c ? c.nome : '';
}

// ── MOVIMENTO ─────────────────────────────────────────────────────────────

function setMov(mov) {
  document.getElementById('fMov').value = mov;
  document.getElementById('togSaida').className   = 'tog-btn' + (mov === 'saida'   ? ' active-saida'   : '');
  document.getElementById('togEntrada').className = 'tog-btn' + (mov === 'entrada' ? ' active-entrada' : '');
  preencherCats(mov);
  document.getElementById('fCartao').value = contaNome(mov);
  document.getElementById('grupoParc').style.display = mov === 'saida' ? 'flex' : 'none';
}

function preencherCats(mov, valorAtual) {
  catsGetAll().then(todas => {
    const cats = todas.filter(c => c.mov === mov);
    const sel  = document.getElementById('fTipo');
    sel.innerHTML = cats.map(c =>
      '<option' + (c.nome === valorAtual ? ' selected' : '') + '>' + c.nome + '</option>'
    ).join('');
  });
}

function preencherFiltroTipo() {
  const movF = document.getElementById('filtroMov').value;
  catsGetAll().then(todas => {
    const filtradas = movF === 'todos' ? todas : todas.filter(c => c.mov === movF);
    const sorted = [...filtradas].sort((a, b) => a.nome.localeCompare(b.nome));
    const sel = document.getElementById('filtroTipo');
    const valorAtual = sel.value;
    sel.innerHTML = '<option value="todos">Todas</option>' +
      sorted.map(c =>
        '<option value="' + c.mov + '|' + c.nome + '">' +
          (movF === 'todos' ? (c.mov === 'entrada' ? '📥 ' : '📤 ') : '') + c.nome +
        '</option>'
      ).join('');
    if ([...sel.options].some(o => o.value === valorAtual)) sel.value = valorAtual;
  });
}

// ── FORM ──────────────────────────────────────────────────────────────────

function limparForm(manterContexto = false) {
  const movAtual    = document.getElementById('fMov').value;
  const cartaoAtual = document.getElementById('fCartao').value;
  const mesAtual    = document.getElementById('fMes').value;
  const anoAtual    = document.getElementById('fAno').value;

  editandoId = null;
  document.getElementById('formTitle').textContent = '➕ Novo Lançamento';
  document.getElementById('fDesc').value  = '';
  document.getElementById('fValor').value = '';
  document.getElementById('fVenc').value  = '';
  document.getElementById('fData').value  = '';
  document.getElementById('fParc').value  = '1';
  document.getElementById('btnCancelar').style.display = 'none';
  document.getElementById('grupoParc').style.display   = 'flex';

  if (manterContexto) {
    document.getElementById('fMov').value = movAtual;
    document.getElementById('togSaida').className   = 'tog-btn' + (movAtual === 'saida'   ? ' active-saida'   : '');
    document.getElementById('togEntrada').className = 'tog-btn' + (movAtual === 'entrada' ? ' active-entrada' : '');
    preencherCats(movAtual);
    document.getElementById('fCartao').value = cartaoAtual;
    document.getElementById('fMes').value    = mesAtual;
    document.getElementById('fAno').value    = anoAtual;
    document.getElementById('grupoParc').style.display = movAtual === 'saida' ? 'flex' : 'none';
  } else {
    setMov('saida');
    document.getElementById('fMes').value = new Date().getMonth();
    document.getElementById('fAno').value = new Date().getFullYear();
  }
  atualizarPreviewParc();
}

async function salvarLancamento() {
  const mov    = document.getElementById('fMov').value;
  const cartao = document.getElementById('fCartao').value;
  const mesIdx = parseInt(document.getElementById('fMes').value);
  const ano    = parseInt(document.getElementById('fAno').value);
  const desc   = document.getElementById('fDesc').value.trim();
  const tipo   = document.getElementById('fTipo').value;
  const venc   = document.getElementById('fVenc').value.trim();
  const data   = document.getElementById('fData').value;
  const valor  = parseFloat(document.getElementById('fValor').value);
  const parc   = parseInt(document.getElementById('fParc').value) || 1;

  if (!desc)                return toast('Informe a descrição.', true);
  if (!valor || valor <= 0) return toast('Informe um valor válido.', true);

  if (editandoId !== null) {
    await dbUpdate({ id: editandoId, mov, cartao, ano, mesIdx, mes: MESES_PT[mesIdx], descricao: desc, tipo, venc, data, valor });
    toast('Lançamento atualizado!');
    limparForm();
    await renderTabela();
    return;
  }

  if (parc <= 1 || mov === 'entrada') {
    await dbAdd({ mov, cartao, ano, mesIdx, mes: MESES_PT[mesIdx], descricao: desc, tipo, venc, data, valor });
    toast('Lançamento salvo!');
  } else {
    const parcelas = gerarParcelas({ mov, cartao, ano, mesIdx, descricao: desc, tipo, venc, data, valor }, parc);
    for (const p of parcelas) await dbAdd(p);
    toast('✅ ' + parc + ' parcelas lançadas (' + fmt(Math.round((valor / parc) * 100) / 100) + '/mês)');
  }
  limparForm(true);
  await renderTabela();
}

// ── EDITAR / EXCLUIR ──────────────────────────────────────────────────────

async function editarLancamento(id) {
  const todos = await dbGetAll();
  const t = todos.find(x => x.id === id);
  if (!t) return;
  editandoId = id;
  const mov = t.mov || 'saida';
  document.getElementById('formTitle').textContent = '✏️ Editar Lançamento';
  setMov(mov);
  preencherCats(mov, t.tipo);
  document.getElementById('fCartao').value = t.cartao;
  document.getElementById('fMes').value    = t.mesIdx;
  document.getElementById('fAno').value    = t.ano || new Date().getFullYear();
  document.getElementById('fDesc').value   = t.descricao;
  document.getElementById('fVenc').value   = t.venc || '';
  document.getElementById('fData').value   = t.data || '';
  document.getElementById('fValor').value  = t.valor;
  document.getElementById('btnCancelar').style.display = 'inline-block';
  document.getElementById('grupoParc').style.display   = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function excluirLancamento(id) {
  abrirModal('Excluir lançamento', 'Tem certeza? Esta ação não pode ser desfeita.',
    async () => { await dbDelete(id); toast('Lançamento excluído.'); await renderTabela(); });
}

function confirmarLimpar() {
  abrirModal('Limpar todos os dados',
    'Isso vai apagar TODOS os lançamentos, contas e categorias permanentemente.',
    async () => {
      await limparTudo();
      toast('Dados apagados.');
      await carregarContas();
      await carregarCats();
      preencherFiltroTipo();
      await renderTabela();
    });
}

// ── RENDER TABELA ─────────────────────────────────────────────────────────

async function renderTabela() {
  await carregarCats();
  const todos   = await dbGetAll();
  const movF    = document.getElementById('filtroMov').value;
  const mesF    = parseInt(document.getElementById('filtroMes').value);
  const anoF    = parseInt(document.getElementById('filtroAno').value);
  const cartaoF = document.getElementById('filtroCartao').value;
  const tipoF   = document.getElementById('filtroTipo').value;
  const busca   = document.getElementById('filtroBusca').value.toLowerCase().trim();

  const anosDisp = [...new Set(todos.map(t => t.ano).filter(Boolean))].sort((a,b) => b - a);
  const filtroAnoEl = document.getElementById('filtroAno');
  const anoSelecionado = filtroAnoEl.value !== '' ? filtroAnoEl.value : String(new Date().getFullYear());
  filtroAnoEl.innerHTML = '<option value="-1">Todos</option>' +
    anosDisp.map(a => '<option value="' + a + '"' + (String(a) === anoSelecionado ? ' selected' : '') + '>' + a + '</option>').join('');
  if (!filtroAnoEl.value || (filtroAnoEl.value === '-1' && anoSelecionado !== '-1')) {
    const anoAtualStr = String(new Date().getFullYear());
    if (anosDisp.map(String).includes(anoAtualStr)) filtroAnoEl.value = anoAtualStr;
  }

  let lista = filtrarLancamentos(todos, { movF, mesF, anoF, cartaoF, tipoF, busca });
  lista = ordenarLancamentos(lista, ordemCampo, ordemDir);

  const { entradas, saidas, saldo } = calcularTotais(lista);
  document.getElementById('summaryBar').innerHTML = [
    '<div class="summary-pill">Entradas: <strong style="color:var(--green)">' + fmt(entradas) + '</strong></div>',
    '<div class="summary-pill">Saídas: <strong style="color:var(--red)">'    + fmt(saidas)   + '</strong></div>',
    '<div class="summary-pill">Saldo: <strong style="color:' + (saldo>=0?'var(--green)':'var(--red)') + '">' + fmt(Math.abs(saldo)) + '</strong></div>',
    '<div class="summary-pill">Registros: <strong>' + lista.length + '</strong></div>',
  ].join('');

  const tbody = document.getElementById('tabelaBody');
  const empty = document.getElementById('emptyState');
  if (lista.length === 0) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  tbody.innerHTML = lista.map(t => {
    const mov = t.mov || 'saida';
    const cor = corTipo(t.tipo, mov);
    const icon = mov === 'entrada' ? '📥' : '📤';
    const vc   = mov === 'entrada' ? 'var(--green)' : 'var(--red)';
    const dataFmt = formatarData(t.data);
    return '<tr data-id="' + t.id + '" data-mov="' + mov + '">' +
      '<td><input type="checkbox" class="chk-linha" data-id="' + t.id + '" onchange="onCheckLinha()"/></td>' +
      '<td style="font-size:1rem">' + icon + '</td>' +
      '<td>' + t.cartao + '</td>' +
      '<td>' + (t.ano || '—') + '</td>' +
      '<td>' + t.mes + '</td>' +
      '<td>' + t.descricao + '</td>' +
      '<td><span class="badge" style="background:' + cor + '22;color:' + cor + '">' + t.tipo + '</span></td>' +
      '<td>' + (t.venc||'—') + '</td>' +
      '<td style="color:var(--muted);white-space:nowrap">' + dataFmt + '</td>' +
      '<td style="text-align:right;font-weight:600;color:' + vc + '">' + fmt(t.valor) + '</td>' +
      '<td style="text-align:center;white-space:nowrap">' +
        '<button class="btn-icon" onclick="editarLancamento(' + t.id + ')">✏️</button>' +
        '<button class="btn-icon" onclick="excluirLancamento(' + t.id + ')">🗑️</button>' +
      '</td></tr>';
  }).join('');
  document.getElementById('chkTodos').checked = false;
  atualizarSelBar();
}

// ── SELEÇÃO MÚLTIPLA ─────────────────────────────────────────────────────

function idsSelecionados() {
  return [...document.querySelectorAll('.chk-linha:checked')].map(c => parseInt(c.dataset.id));
}

function atualizarSelBar() {
  const ids = idsSelecionados();
  document.getElementById('selBar').classList.toggle('visible', ids.length > 0);
  document.getElementById('selCount').textContent = ids.length + ' selecionado' + (ids.length !== 1 ? 's' : '');
  document.querySelectorAll('#tabelaBody tr').forEach(tr => {
    const chk = tr.querySelector('.chk-linha');
    tr.classList.toggle('selecionada', chk && chk.checked);
  });
  const todos = document.querySelectorAll('.chk-linha');
  const chkTodos = document.getElementById('chkTodos');
  if (todos.length === 0)             { chkTodos.checked = false; chkTodos.indeterminate = false; }
  else if (ids.length === 0)          { chkTodos.checked = false; chkTodos.indeterminate = false; }
  else if (ids.length === todos.length) { chkTodos.checked = true; chkTodos.indeterminate = false; }
  else                                { chkTodos.checked = false; chkTodos.indeterminate = true; }

  const btnCat = document.getElementById('btnAlterarCat');
  if (ids.length === 0) { btnCat.disabled = true; btnCat.title = 'Selecione lançamentos do mesmo tipo'; return; }
  const movimentos = new Set([...document.querySelectorAll('.chk-linha:checked')].map(c => c.closest('tr').dataset.mov));
  const homogeneo = movimentos.size === 1;
  btnCat.disabled = !homogeneo;
  btnCat.title = homogeneo
    ? 'Alterar categoria dos ' + ids.length + ' lançamentos selecionados'
    : 'Mistura de saídas e entradas — selecione apenas um tipo';
}

function onCheckLinha() { atualizarSelBar(); }
function toggleTodos(checked) { document.querySelectorAll('.chk-linha').forEach(c => { c.checked = checked; }); atualizarSelBar(); }
function limparSelecao() { document.querySelectorAll('.chk-linha').forEach(c => { c.checked = false; }); document.getElementById('chkTodos').checked = false; atualizarSelBar(); }

function excluirSelecionados() {
  const ids = idsSelecionados();
  if (ids.length === 0) return;
  abrirModal('Excluir ' + ids.length + ' lançamento' + (ids.length !== 1 ? 's' : ''), 'Tem certeza? Esta ação não pode ser desfeita.',
    async () => { for (const id of ids) await dbDelete(id); toast(ids.length + ' lançamento' + (ids.length !== 1 ? 's excluídos' : ' excluído') + '.'); await renderTabela(); });
}

async function exportarSelecionados() {
  const ids = idsSelecionados();
  if (ids.length === 0) return;
  const todos = await dbGetAll();
  const selecionados = todos.filter(t => ids.includes(t.id));
  const blob = new Blob([JSON.stringify({ transacoes: selecionados }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'lancamentos_' + new Date().toISOString().slice(0,10) + '.json'; a.click();
  URL.revokeObjectURL(url);
  toast('⬇ ' + ids.length + ' lançamento' + (ids.length !== 1 ? 's exportados' : ' exportado') + '.');
}

// ── RELATÓRIO ─────────────────────────────────────────────────────────────

async function abrirRelatorio() {
  const ids = idsSelecionados();
  if (ids.length === 0) return;
  const todos = await dbGetAll();
  const lista = todos.filter(t => ids.includes(t.id));
  const entradas = lista.filter(t => t.mov === 'entrada');
  const saidas   = lista.filter(t => (t.mov || 'saida') === 'saida');
  const totalEnt = entradas.reduce((s, t) => s + t.valor, 0);
  const totalSai = saidas.reduce((s, t) => s + t.valor, 0);
  const saldo    = totalEnt - totalSai;

  function linhas(grupo) {
    if (grupo.length === 0) return '<tr><td colspan="2" style="color:#94a3b8;font-style:italic;padding:.5rem .75rem">Nenhum</td></tr>';
    return grupo.map(t => '<tr><td style="padding:.45rem .75rem;border-bottom:1px solid #2d3148">' + t.descricao + '</td>' +
      '<td style="padding:.45rem .75rem;border-bottom:1px solid #2d3148;text-align:right;white-space:nowrap;font-weight:600;color:' + (t.mov==='entrada'?'#22c55e':'#ef4444') + '">' + fmt(t.valor) + '</td></tr>').join('');
  }

  function tabelaGrupo(grupo, label, cor, total) {
    if (grupo.length === 0) return '';
    return '<p style="font-size:.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem">' + label + '</p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:.88rem;margin-bottom:1.25rem"><thead><tr>' +
      '<th style="text-align:left;padding:.4rem .75rem;border-bottom:1px solid #2d3148;color:#94a3b8;font-weight:600">Descrição</th>' +
      '<th style="text-align:right;padding:.4rem .75rem;border-bottom:1px solid #2d3148;color:#94a3b8;font-weight:600">Valor</th>' +
      '</tr></thead><tbody>' + linhas(grupo) + '</tbody><tfoot><tr>' +
      '<td style="padding:.5rem .75rem;font-weight:700">Total ' + label.toLowerCase() + '</td>' +
      '<td style="padding:.5rem .75rem;text-align:right;font-weight:700;color:' + cor + '">' + fmt(total) + '</td>' +
      '</tr></tfoot></table>';
  }

  document.getElementById('relConteudo').innerHTML =
    '<p style="font-size:.8rem;color:#94a3b8;margin-bottom:1rem">Gerado em ' +
      new Date().toLocaleDateString('pt-BR', {day:'2-digit',month:'long',year:'numeric'}) +
      ' &nbsp;·&nbsp; ' + ids.length + ' lançamento' + (ids.length !== 1 ? 's' : '') + '</p>' +
    tabelaGrupo(saidas, 'Saídas', '#ef4444', totalSai) +
    tabelaGrupo(entradas, 'Entradas', '#22c55e', totalEnt) +
    '<div style="background:#22263a;border-radius:10px;padding:.75rem 1rem;display:flex;justify-content:space-between;align-items:center">' +
      '<span style="font-weight:700">Saldo</span>' +
      '<span style="font-weight:700;font-size:1.05rem;color:' + (saldo>=0?'#22c55e':'#ef4444') + '">' + fmt(Math.abs(saldo)) + '</span></div>';

  document.getElementById('modalRelOverlay').classList.add('open');
}

function fecharRelatorio() { document.getElementById('modalRelOverlay').classList.remove('open'); }

function imprimirRelatorio() {
  const conteudo = document.getElementById('relConteudo').innerHTML;
  const win = window.open('', '_blank', 'width=700,height=600');
  win.document.write('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Relatório</title>' +
    '<style>body{font-family:"Segoe UI",sans-serif;padding:2rem;color:#111;background:#fff}' +
    'table{width:100%;border-collapse:collapse;font-size:.9rem;margin-bottom:1.5rem}' +
    'th,td{padding:.45rem .75rem;border-bottom:1px solid #ddd;text-align:left}th{font-weight:600;color:#555}' +
    'td:last-child,th:last-child{text-align:right}tfoot td{font-weight:700;border-top:2px solid #ccc;border-bottom:none}' +
    'p{color:#777;font-size:.8rem;margin-bottom:1rem}@media print{body{padding:1rem}}</style>' +
    '</head><body><h1>📄 Relatório de Lançamentos</h1>' + conteudo + '</body></html>');
  win.document.close(); win.focus(); win.print();
}

// ── ALTERAR CATEGORIA EM MASSA ────────────────────────────────────────────

async function abrirAlterarCategoria() {
  const ids = idsSelecionados();
  if (ids.length === 0) return;
  const mov = [...document.querySelectorAll('.chk-linha:checked')][0].closest('tr').dataset.mov || 'saida';
  const todas = await catsGetAll();
  const sel = document.getElementById('selNovaCat');
  sel.innerHTML = todas.filter(c => c.mov === mov).map(c => '<option value="' + c.nome + '">' + c.nome + '</option>').join('');
  document.getElementById('modalCatTitle').textContent = '🏷 Alterar Categoria — ' + (mov === 'saida' ? 'Saída' : 'Entrada');
  document.getElementById('modalCatInfo').textContent  = ids.length + ' lançamento' + (ids.length !== 1 ? 's' : '') + ' serão atualizados.';
  document.getElementById('modalCatOverlay').classList.add('open');
}

async function confirmarAlterarCategoria() {
  const ids = idsSelecionados();
  const novaCat = document.getElementById('selNovaCat').value;
  if (!novaCat || ids.length === 0) return;
  const todos = await dbGetAll();
  for (const id of ids) { const t = todos.find(x => x.id === id); if (t) await dbUpdate({ ...t, tipo: novaCat }); }
  fecharModalCat();
  toast('✅ Categoria alterada para "' + novaCat + '" em ' + ids.length + ' lançamento' + (ids.length !== 1 ? 's' : '') + '.');
  await renderTabela();
}

function fecharModalCat() { document.getElementById('modalCatOverlay').classList.remove('open'); }

// ── IMPORT ────────────────────────────────────────────────────────────────

async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const n = await importarJSON(file);
    toast(n.transacoes + ' lançamentos, ' + n.contas + ' contas e ' + n.categorias + ' categorias importados!');
    await carregarContas(); await carregarCats(); preencherFiltroTipo(); await renderTabela();
  } catch(err) { toast('Erro: ' + err.message, true); }
  e.target.value = '';
}

// ── PREVIEW PARCELAS ─────────────────────────────────────────────────────

function atualizarPreviewParc() {
  const parc   = parseInt(document.getElementById('fParc').value) || 1;
  const valor  = parseFloat(document.getElementById('fValor').value);
  const mesIdx = parseInt(document.getElementById('fMes').value);
  const ano    = parseInt(document.getElementById('fAno').value) || new Date().getFullYear();
  const el     = document.getElementById('previewParc');
  const result = calcularPreviewParc(parc, valor, mesIdx, ano);
  if (!result) { el.textContent = ''; return; }
  el.textContent = valor > 0
    ? fmt(result.valorParcela) + '/mês · até ' + result.label
    : 'até ' + result.label;
}

// ── ORDENAÇÃO ────────────────────────────────────────────────────────────

let ordemCampo = 'valor';
let ordemDir   = 'desc';

function toggleOrdem(campo) {
  if (ordemCampo === campo) { ordemDir = ordemDir === 'desc' ? 'asc' : 'desc'; }
  else { ordemCampo = campo; ordemDir = 'desc'; }
  atualizarIconesOrdem();
  renderTabela();
}

function atualizarIconesOrdem() {
  const seta = ordemDir === 'desc' ? '▼' : '▲';
  document.getElementById('iconData').textContent  = ordemCampo === 'data'  ? seta : '';
  document.getElementById('iconValor').textContent = ordemCampo === 'valor' ? seta : '';
  document.getElementById('thData').style.color  = ordemCampo === 'data'  ? 'var(--accent)' : '';
  document.getElementById('thValor').style.color = ordemCampo === 'valor' ? 'var(--accent)' : '';
}

// ── INIT ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  // Popula select de anos no formulário (ano atual ± 3)
  const selAno = document.getElementById('fAno');
  for (let a = anoAtual + 1; a >= anoAtual - 3; a--) {
    const opt = document.createElement('option');
    opt.value = a; opt.textContent = a;
    if (a === anoAtual) opt.selected = true;
    selAno.appendChild(opt);
  }

  document.getElementById('fMes').value      = mesAtual;
  document.getElementById('filtroMes').value = mesAtual;
  document.getElementById('filtroAno').value = anoAtual;

  // Filtros
  ['filtroMov','filtroMes','filtroAno','filtroCartao','filtroTipo','filtroBusca'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderTabela);
    document.getElementById(id).addEventListener('input',  renderTabela);
  });
  document.getElementById('filtroMov').addEventListener('change', preencherFiltroTipo);
  document.getElementById('fMes').addEventListener('change', () => {
    document.getElementById('filtroMes').value = document.getElementById('fMes').value; renderTabela();
  });
  document.getElementById('fAno').addEventListener('change', () => {
    document.getElementById('filtroAno').value = document.getElementById('fAno').value; renderTabela();
  });

  // Preview parcelas
  ['fParc','fValor','fMes','fAno'].forEach(id =>
    document.getElementById(id).addEventListener('input', atualizarPreviewParc));

  // Modais
  document.getElementById('modalCatOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharModalCat(); });
  document.getElementById('modalRelOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharRelatorio(); });

  // Reset ao clicar na aba ativa
  document.querySelector('nav a[href="index.html"]').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('filtroMes').value    = new Date().getMonth();
    document.getElementById('filtroAno').value    = new Date().getFullYear();
    document.getElementById('filtroMov').value    = 'todos';
    document.getElementById('filtroCartao').value = 'todos';
    document.getElementById('filtroTipo').value   = 'todos';
    document.getElementById('filtroBusca').value  = '';
    preencherFiltroTipo();
    renderTabela();
  });

  // Versão
  const vEl = document.getElementById('navVersion');
  if (vEl) vEl.textContent = 'v' + (window.appVersion || '3.0.0');
  updateNavUser();

  // Inicializa
  carregarContas().then(async () => {
    await carregarCats();
    preencherFiltroTipo();
    atualizarIconesOrdem();
    setMov('saida');
    renderTabela();
  });
});
