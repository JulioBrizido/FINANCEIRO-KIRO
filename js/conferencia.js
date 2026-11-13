/**
 * conferencia.js — Controller da aba Conferência Mensal (conferencia.html)
 *
 * Lógica:
 *  - Lançamentos de contas do tipo 'cartao': aglutinados por cartão,
 *    mostrando somente o total do mês (1 linha por cartão).
 *  - Lançamentos de contas dos tipos 'conta', 'carteira', 'outro':
 *    exibidos individualmente, linha a linha.
 *  - Checkbox por linha, persistido via configGet / configSet
 *    com chave  'conf:{ano}:{mesIdx}'  → valor JSON {[linhaKey]: true|false}
 *    linhaKey para lançamentos fixos: id da transação
 *    linhaKey para cartões aglutinados: nome do cartão (ex: "Bradesco")
 */

let _contas      = [];
let _cats        = [];
let _estado      = {};   // { [linhaKey]: true } — itens confirmados
let _chaveConfig = '';   // 'conf:2026:9'
let _ordemCampo  = 'valor';
let _ordemDir    = 'desc';

// ── HELPERS ───────────────────────────────────────────────────────────────

function corTipo(tipo, mov) {
  const cat = _cats.find(c => c.nome === tipo && c.mov === mov)
           || _cats.find(c => c.nome === tipo);
  return cat ? cat.cor : '#94a3b8';
}

function isCartao(nomeConta) {
  const c = _contas.find(x => x.nome === nomeConta);
  return c && c.tipo === 'cartao';
}

function corConta(nomeConta) {
  const c = _contas.find(x => x.nome === nomeConta);
  return c ? c.cor : '#94a3b8';
}

// ── PERSISTÊNCIA DE ESTADO ────────────────────────────────────────────────

async function carregarEstado(ano, mesIdx) {
  _chaveConfig = 'conf:' + ano + ':' + mesIdx;
  try {
    const raw = await configGet(_chaveConfig);
    _estado = raw ? JSON.parse(raw) : {};
  } catch {
    _estado = {};
  }
}

async function salvarEstado() {
  try {
    await configSet(_chaveConfig, JSON.stringify(_estado));
  } catch (e) {
    toast('Erro ao salvar estado: ' + e.message, true);
  }
}

// ── TOGGLE CHECKBOX ───────────────────────────────────────────────────────

async function toggleConferencia(key, chk) {
  if (chk.checked) {
    _estado[key] = true;
  } else {
    delete _estado[key];
  }
  await salvarEstado();

  // Atualiza visual da linha sem re-renderizar a tabela inteira
  const tr = chk.closest('tr');
  if (tr) tr.classList.toggle('confirmada', chk.checked);

  atualizarProgresso();
  atualizarSummary();
}

// ── ORDENAÇÃO ─────────────────────────────────────────────────────────────

function toggleOrdem(campo) {
  if (_ordemCampo === campo) {
    _ordemDir = _ordemDir === 'desc' ? 'asc' : 'desc';
  } else {
    _ordemCampo = campo;
    _ordemDir   = 'desc';
  }
  atualizarBotoesOrdem();
  renderTabela();
}

function atualizarBotoesOrdem() {
  const seta = _ordemDir === 'desc' ? '▼' : '▲';
  document.getElementById('btnOrdemValor').textContent =
    'Valor' + (_ordemCampo === 'valor' ? ' ' + seta : '');
  document.getElementById('btnOrdemVenc').textContent  =
    'Vencimento' + (_ordemCampo === 'venc' ? ' ' + seta : '');
}

// ── MONTAR LINHAS ─────────────────────────────────────────────────────────

/**
 * Constrói o array de linhas a exibir a partir de todas as transações
 * já filtradas pelo mês/ano selecionado.
 *
 * Retorna dois grupos:
 *   - fixos: lançamentos individuais (tipo conta/carteira/outro)
 *   - cartoes: uma linha agregada por cartão
 */
function montarLinhas(transacoesMes) {
  const fixos   = [];
  const agregados = {};   // nomeConta → { total, mov, venc, itens[] }

  for (const t of transacoesMes) {
    if (isCartao(t.cartao)) {
      if (!agregados[t.cartao]) {
        agregados[t.cartao] = { total: 0, mov: t.mov || 'saida', venc: t.venc || '', itens: [] };
      }
      agregados[t.cartao].total += t.valor;
      // Propaga vencimento se todos os itens tiverem o mesmo
      if (t.venc && agregados[t.cartao].venc !== t.venc) {
        // usa o primeiro venc encontrado como referência
        if (!agregados[t.cartao]._vencSet) {
          agregados[t.cartao].venc     = t.venc;
          agregados[t.cartao]._vencSet = true;
        }
      }
      agregados[t.cartao].itens.push(t);
    } else {
      fixos.push(t);
    }
  }

  // Ordena fixos
  const fixosOrd = ordenarLinhas(fixos);

  // Monta linhas de cartão
  const linhasCartao = Object.entries(agregados).map(([nome, ag]) => ({
    _tipo: 'cartao',
    key:   nome,
    nome,
    valor: Math.round(ag.total * 100) / 100,
    mov:   ag.mov,
    venc:  ag.venc,
    itens: ag.itens,
  }));
  const cartoesOrd = ordenarLinhas(linhasCartao);

  return { fixos: fixosOrd, cartoes: cartoesOrd };
}

function ordenarLinhas(lista) {
  return [...lista].sort((a, b) => {
    if (_ordemCampo === 'venc') {
      const va = parseInt(a.venc) || 999;
      const vb = parseInt(b.venc) || 999;
      return _ordemDir === 'asc' ? va - vb : vb - va;
    }
    // valor
    const va = a.valor || 0;
    const vb = b.valor || 0;
    return _ordemDir === 'desc' ? vb - va : va - vb;
  });
}

// ── RENDER TABELA ─────────────────────────────────────────────────────────

async function renderTabela() {
  const mesIdx   = parseInt(document.getElementById('filtroMes').value);
  const ano      = parseInt(document.getElementById('filtroAno').value);

  const todos    = await dbGetAll();
  const doMes    = todos.filter(t => t.mesIdx === mesIdx && (t.ano || 0) === ano);

  const { fixos, cartoes } = montarLinhas(doMes);

  const tbody = document.getElementById('tabelaBody');
  const empty = document.getElementById('emptyState');

  if (fixos.length === 0 && cartoes.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    atualizarProgresso(0, 0);
    atualizarSummaryDados([], []);
    return;
  }
  empty.style.display = 'none';

  const rows = [];

  // ── SEÇÃO ENTRADAS FIXAS ──
  const entradasFixas = fixos.filter(t => (t.mov || 'saida') === 'entrada');
  if (entradasFixas.length > 0) {
    rows.push('<tr class="section-header"><td colspan="7">📥 Entradas</td></tr>');
    rows.push(...entradasFixas.map(t => rowFixo(t)));
  }

  // ── SEÇÃO SAÍDAS FIXAS ──
  const saidasFixas = fixos.filter(t => (t.mov || 'saida') === 'saida');
  if (saidasFixas.length > 0) {
    rows.push('<tr class="section-header"><td colspan="7">📤 Saídas Fixas</td></tr>');
    rows.push(...saidasFixas.map(t => rowFixo(t)));
  }

  // ── SEÇÃO CARTÕES ──
  if (cartoes.length > 0) {
    rows.push('<tr class="section-header"><td colspan="7">💳 Cartões (total do mês)</td></tr>');
    rows.push(...cartoes.map(l => rowCartao(l)));
  }

  tbody.innerHTML = rows.join('');
  atualizarProgresso();
  atualizarSummaryDados(fixos, cartoes);
}

function rowFixo(t) {
  const key      = String(t.id);
  const conf     = !!_estado[key];
  const mov      = t.mov || 'saida';
  const icon     = mov === 'entrada' ? '📥' : '📤';
  const vc       = mov === 'entrada' ? 'var(--green)' : 'var(--red)';
  const cor      = corTipo(t.tipo, mov);
  const contaCor = corConta(t.cartao);

  return '<tr class="' + (conf ? 'confirmada' : '') + '" data-key="' + key + '">' +
    '<td><input type="checkbox" class="chk-conf" data-key="' + key + '"' +
      (conf ? ' checked' : '') +
      ' onchange="toggleConferencia(\'' + key + '\', this)"/></td>' +
    '<td style="font-size:1rem">' + icon + '</td>' +
    '<td><span class="cartao-pill">' +
      '<span class="cartao-dot" style="background:' + contaCor + '"></span>' +
      t.cartao +
    '</span></td>' +
    '<td>' + t.descricao + '</td>' +
    '<td><span class="badge" style="background:' + cor + '22;color:' + cor + '">' + t.tipo + '</span></td>' +
    '<td style="color:var(--muted)">' + (t.venc || '—') + '</td>' +
    '<td style="text-align:right;font-weight:600;color:' + vc + '">' + fmt(t.valor) + '</td>' +
    '</tr>';
}

function rowCartao(l) {
  const key      = l.key;   // nome do cartão
  const conf     = !!_estado[key];
  const contaCor = corConta(l.nome);
  const mov      = l.mov || 'saida';
  const vc       = mov === 'entrada' ? 'var(--green)' : 'var(--red)';
  const icon     = mov === 'entrada' ? '📥' : '📤';
  const nItens   = l.itens.length;

  // Key inline safe (nome do cartão pode ter espaços mas não aspas)
  const keyEsc = key.replace(/'/g, "\\'");

  return '<tr class="' + (conf ? 'confirmada' : '') + '" data-key="' + key + '">' +
    '<td><input type="checkbox" class="chk-conf" data-key="' + keyEsc + '"' +
      (conf ? ' checked' : '') +
      ' onchange="toggleConferencia(\'' + keyEsc + '\', this)"/></td>' +
    '<td style="font-size:1rem">' + icon + '</td>' +
    '<td><span class="cartao-pill">' +
      '<span class="cartao-dot" style="background:' + contaCor + '"></span>' +
      l.nome +
    '</span></td>' +
    '<td style="color:var(--muted);font-style:italic">' + nItens + ' lançamento' + (nItens !== 1 ? 's' : '') + '</td>' +
    '<td><span class="badge" style="background:#6c63ff22;color:#6c63ff">Total fatura</span></td>' +
    '<td style="color:var(--muted)">' + (l.venc || '—') + '</td>' +
    '<td style="text-align:right;font-weight:600;color:' + vc + '">' + fmt(l.valor) + '</td>' +
    '</tr>';
}

// ── PROGRESSO ─────────────────────────────────────────────────────────────

function atualizarProgresso() {
  const chks    = [...document.querySelectorAll('.chk-conf')];
  const total   = chks.length;
  const feitos  = chks.filter(c => c.checked).length;
  const pct     = total > 0 ? Math.round((feitos / total) * 100) : 0;

  document.getElementById('progressFill').style.width   = pct + '%';
  document.getElementById('progressLabel').textContent  =
    feitos + ' / ' + total + ' confirmado' + (total !== 1 ? 's' : '') + ' (' + pct + '%)';
}

// ── SUMMARY ───────────────────────────────────────────────────────────────

function atualizarSummary() {
  // Recalcula a partir dos checkboxes em tela
  const chks = [...document.querySelectorAll('.chk-conf')];
  let entConf = 0, saiConf = 0, entPend = 0, saiPend = 0;

  chks.forEach(chk => {
    const tr  = chk.closest('tr');
    if (!tr) return;
    const valEl = tr.querySelector('td:last-child');
    if (!valEl) return;
    // Detecta movimento pela cor do valor
    const isEnt = valEl.style.color.includes('green') || valEl.style.color === 'var(--green)';
    const val   = parseValorFmt(valEl.textContent);
    if (chk.checked) { if (isEnt) entConf += val; else saiConf += val; }
    else             { if (isEnt) entPend += val; else saiPend += val; }
  });

  const saldoConf = entConf - saiConf;
  document.getElementById('summaryBar').innerHTML = [
    '<div class="summary-pill">Entradas confirmadas: <strong style="color:var(--green)">' + fmt(entConf) + '</strong></div>',
    '<div class="summary-pill">Saídas confirmadas: <strong style="color:var(--red)">'    + fmt(saiConf) + '</strong></div>',
    '<div class="summary-pill">Saldo confirmado: <strong style="color:' + (saldoConf >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(Math.abs(saldoConf)) + '</strong></div>',
    '<div class="summary-pill">Pendentes: <strong style="color:var(--yellow)">' + fmt(entPend + saiPend) + '</strong></div>',
  ].join('');
}

function atualizarSummaryDados(fixos, cartoes) {
  // Versão chamada logo após o render, antes do DOM ter os checkboxes
  let entradas = 0, saidas = 0;
  for (const t of fixos) {
    if ((t.mov || 'saida') === 'entrada') entradas += t.valor;
    else saidas += t.valor;
  }
  for (const l of cartoes) {
    if ((l.mov || 'saida') === 'entrada') entradas += l.valor;
    else saidas += l.valor;
  }
  const saldo = entradas - saidas;
  document.getElementById('summaryBar').innerHTML = [
    '<div class="summary-pill">Entradas do mês: <strong style="color:var(--green)">'  + fmt(entradas)        + '</strong></div>',
    '<div class="summary-pill">Saídas do mês: <strong style="color:var(--red)">'      + fmt(saidas)          + '</strong></div>',
    '<div class="summary-pill">Saldo: <strong style="color:' + (saldo >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(Math.abs(saldo)) + '</strong></div>',
  ].join('');
}

function parseValorFmt(str) {
  // "R$ 1.234,56" → 1234.56
  return parseFloat((str || '0').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

// ── POPULAR SELECT DE ANO ─────────────────────────────────────────────────

async function popularAnos() {
  const todos = await dbGetAll();
  const anos  = [...new Set(todos.map(t => t.ano).filter(Boolean))].sort((a, b) => b - a);
  const sel   = document.getElementById('filtroAno');
  const anoAtual = new Date().getFullYear();
  if (anos.length === 0) anos.push(anoAtual);
  sel.innerHTML = anos.map(a =>
    '<option value="' + a + '"' + (a === anoAtual ? ' selected' : '') + '>' + a + '</option>'
  ).join('');
}

// ── INIT ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const vEl = document.getElementById('navVersion');
  if (vEl) vEl.textContent = 'v' + (window.appVersion || '4.0.2');
  updateNavUser();

  // Preenche contas e cats
  _contas = await contasGetAll();
  _cats   = await catsGetAll();

  // Preenche anos
  await popularAnos();

  // Mês e ano padrão = atual
  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();
  document.getElementById('filtroMes').value = mesAtual;
  document.getElementById('filtroAno').value = anoAtual;

  // Carrega estado salvo e renderiza
  await carregarEstado(anoAtual, mesAtual);
  await renderTabela();
  atualizarBotoesOrdem();

  // Listeners de filtro
  async function onFiltroChange() {
    const mes = parseInt(document.getElementById('filtroMes').value);
    const ano = parseInt(document.getElementById('filtroAno').value);
    await carregarEstado(ano, mes);
    await renderTabela();
  }

  document.getElementById('filtroMes').addEventListener('change', onFiltroChange);
  document.getElementById('filtroAno').addEventListener('change', onFiltroChange);
});
