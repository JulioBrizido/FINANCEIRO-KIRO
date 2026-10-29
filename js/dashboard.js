/**
 * dashboard.js — Controller do Dashboard (dashboard.html)
 * Depende de: db.js, js/utils.browser.js, Chart.js (global)
 */

const CARTOES = [];
let _contas = [];
let _cats   = [];
let allTransacoes = [];
let charts = {};

async function carregarCats() { _cats = await catsGetAll(); }

function corTipo(tipo, mov) {
  const cat = _cats.find(c => c.nome === tipo && c.mov === mov) || _cats.find(c => c.nome === tipo);
  return cat ? cat.cor : '#94a3b8';
}

async function init() {
  _contas = await contasGetAll();
  await carregarCats();
  const cartaoSel = document.getElementById('cartaoSelect');
  cartaoSel.innerHTML = '<option value="todos">Todos</option>' +
    _contas.map(c => '<option value="' + c.nome + '">' + c.nome + '</option>').join('');

  CARTOES.length = 0;
  _contas.filter(c => c.tipo === 'cartao').forEach(c => CARTOES.push(c.nome));
  if (CARTOES.length === 0) _contas.forEach(c => CARTOES.push(c.nome));

  allTransacoes = await dbGetAll();

  if (allTransacoes.length === 0) {
    document.getElementById('emptyState').style.display = 'flex';
    return;
  }

  const anosDisp = [...new Set(allTransacoes.map(t => t.ano).filter(Boolean))].sort((a,b) => b - a);
  const selAno = document.getElementById('anoSelect');
  anosDisp.forEach(a => { const opt = document.createElement('option'); opt.value = a; opt.textContent = a; selAno.appendChild(opt); });
  const anoAtual = new Date().getFullYear();
  if (anosDisp.includes(anoAtual)) selAno.value = anoAtual;

  const mesesPresentes = [...new Set(allTransacoes.map(t => t.mesIdx))].sort((a,b) => a - b);
  const sel = document.getElementById('mesSelect');
  mesesPresentes.forEach(idx => { const opt = document.createElement('option'); opt.value = idx; opt.textContent = MESES_PT[idx]; sel.appendChild(opt); });
  const mesAtual = new Date().getMonth();
  sel.value = mesesPresentes.includes(mesAtual) ? mesAtual : mesesPresentes[mesesPresentes.length - 1];

  document.getElementById('dashboard').style.display = 'block';
  renderDashboard();

  sel.addEventListener('change', renderDashboard);
  cartaoSel.addEventListener('change', renderDashboard);
  selAno.addEventListener('change', renderDashboard);

  document.querySelector('nav a[href="dashboard.html"]').addEventListener('click', function(e) {
    e.preventDefault();
    const agora = new Date();
    const selMes = document.getElementById('mesSelect');
    const selAnoEl = document.getElementById('anoSelect');
    const mesesOpts = [...selMes.options].map(o => parseInt(o.value));
    selMes.value = mesesOpts.includes(agora.getMonth()) ? agora.getMonth() : mesesOpts[mesesOpts.length - 1];
    const anosOpts = [...selAnoEl.options].map(o => parseInt(o.value));
    selAnoEl.value = anosOpts.includes(agora.getFullYear()) ? agora.getFullYear() : (anosOpts[1] || -1);
    document.getElementById('cartaoSelect').value = 'todos';
    renderDashboard();
  });
}

function renderDashboard() {
  const mesIdx       = parseInt(document.getElementById('mesSelect').value);
  const anoFiltro    = parseInt(document.getElementById('anoSelect').value);
  const cartaoFiltro = document.getElementById('cartaoSelect').value;

  let filtrado = allTransacoes;
  if (mesIdx !== -1)            filtrado = filtrado.filter(t => t.mesIdx === mesIdx);
  if (anoFiltro !== -1)         filtrado = filtrado.filter(t => (t.ano||0) === anoFiltro);
  if (cartaoFiltro !== 'todos') filtrado = filtrado.filter(t => t.cartao === cartaoFiltro);

  const semCarteira = filtrado.filter(t => t.cartao !== 'Carteira');
  renderCards(semCarteira, mesIdx, anoFiltro);
  renderDonut(semCarteira);
  renderBarCartoes(mesIdx, anoFiltro);
  renderLinhas();
  renderSaldo(anoFiltro);
  renderTabela(filtrado);
}

function renderCards(semCarteira, mesIdx, anoFiltro) {
  const entradas = semCarteira.filter(t => t.mov === 'entrada').reduce((s,t) => s + t.valor, 0);
  const saidas   = semCarteira.filter(t => (t.mov||'saida') === 'saida').reduce((s,t) => s + t.valor, 0);
  const saldo    = entradas - saidas;
  const label    = mesIdx === -1 ? 'todos os meses' : MESES_PT[mesIdx];

  document.getElementById('cardEntradas').textContent    = fmt(entradas);
  document.getElementById('cardEntradasSub').textContent = label;
  document.getElementById('cardSaidas').textContent      = fmt(saidas);
  document.getElementById('cardSaidasSub').textContent   = label;
  const saldoEl = document.getElementById('cardSaldo');
  saldoEl.textContent = fmt(Math.abs(saldo));
  saldoEl.className   = 'value ' + (saldo >= 0 ? 'positive' : 'negative');

  let base = allTransacoes.filter(t => (t.mov||'saida') === 'saida' && t.cartao !== 'Carteira');
  if (mesIdx    !== -1) base = base.filter(t => t.mesIdx === mesIdx);
  if (anoFiltro !== -1) base = base.filter(t => (t.ano||0) === anoFiltro);

  const totalCartoes = base.filter(t => { const conta = _contas.find(c => c.nome === t.cartao); return conta && conta.tipo === 'cartao'; })
                           .reduce((s,t) => s + t.valor, 0);
  document.getElementById('cardCartoes').textContent = fmt(totalCartoes);

  const porTipo = {};
  semCarteira.filter(t => (t.mov||'saida') === 'saida').forEach(t => { porTipo[t.tipo] = (porTipo[t.tipo]||0) + t.valor; });
  const sorted = Object.entries(porTipo).sort((a,b) => b[1] - a[1]);
  if (sorted.length) {
    document.getElementById('cardMaiorCat').textContent    = sorted[0][0];
    document.getElementById('cardMaiorCatVal').textContent = fmt(sorted[0][1]);
  }
  calcularCarteira(mesIdx, anoFiltro);
}

function calcularCarteira(mesIdx, anoFiltro) {
  const { saldo, mesLimite } = calcularSaldoCarteira(allTransacoes, mesIdx, anoFiltro);
  const ano = anoFiltro !== -1 ? anoFiltro : null;
  const el = document.getElementById('cardCarteira');
  el.textContent = fmt(Math.abs(saldo));
  el.className   = 'value ' + (saldo >= 0 ? 'positive' : 'negative');
  document.getElementById('cardCarteiraSub').textContent = 'ate ' + MESES_PT[mesLimite] + (ano ? '/' + ano : '');
}

function renderDonut(semCarteira) {
  const porTipo = {};
  semCarteira.filter(t => (t.mov||'saida') === 'saida').forEach(t => { porTipo[t.tipo] = (porTipo[t.tipo]||0) + t.valor; });
  const sorted = Object.entries(porTipo).sort((a,b) => b[1] - a[1]);
  if (charts.donut) charts.donut.destroy();
  charts.donut = new Chart(document.getElementById('chartDonut'), {
    type: 'doughnut',
    data: { labels: sorted.map(e => e[0]), datasets: [{ data: sorted.map(e => e[1]), backgroundColor: sorted.map(e => corTipo(e[0], 'saida')), borderWidth: 2, borderColor: '#1a1d27' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#e2e8f0', font: { size: 12 }, padding: 12 } }, tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.raw) } } } },
  });
}

function renderBarCartoes(mesIdx, anoFiltro) {
  let base = allTransacoes.filter(t => (t.mov||'saida') === 'saida' && t.cartao !== 'Carteira');
  if (mesIdx !== -1)    base = base.filter(t => t.mesIdx === mesIdx);
  if (anoFiltro !== -1) base = base.filter(t => (t.ano||0) === anoFiltro);
  const cores = CARTOES.map(n => { const c = _contas.find(x => x.nome === n); return c ? c.cor : '#94a3b8'; });
  if (charts.bar) charts.bar.destroy();
  charts.bar = new Chart(document.getElementById('chartCartoes'), {
    type: 'bar',
    data: { labels: CARTOES, datasets: [{ label: 'Total (R$)', data: CARTOES.map(c => base.filter(t => t.cartao === c).reduce((s,t) => s + t.valor, 0)), backgroundColor: cores, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: '#2d3148' } }, y: { ticks: { color: '#94a3b8', callback: v => 'R$ ' + v.toLocaleString('pt-BR') }, grid: { color: '#2d3148' } } } },
  });
}

function renderLinhas() {
  const mesesPresentes = [...new Set(allTransacoes.map(t => t.mesIdx))].sort((a,b) => a - b);
  const datasets = CARTOES.map(c => {
    const conta = _contas.find(x => x.nome === c);
    const cor = conta ? conta.cor : '#94a3b8';
    return { label: c, data: mesesPresentes.map(m => allTransacoes.filter(t => t.cartao === c && t.mesIdx === m && (t.mov||'saida') === 'saida').reduce((s,t) => s + t.valor, 0)), borderColor: cor, backgroundColor: cor + '33', tension: 0.4, fill: true, pointRadius: 4 };
  });
  if (charts.linhas) charts.linhas.destroy();
  charts.linhas = new Chart(document.getElementById('chartLinhas'), {
    type: 'line',
    data: { labels: mesesPresentes.map(i => MESES_PT[i].substring(0, 3)), datasets },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e2e8f0' } }, tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.raw) } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: '#2d3148' } }, y: { ticks: { color: '#94a3b8', callback: v => 'R$ ' + v.toLocaleString('pt-BR') }, grid: { color: '#2d3148' } } } },
  });
}

function renderSaldo(anoFiltro) {
  const ano = anoFiltro !== -1 ? anoFiltro : null;
  const mesesPresentes = [...new Set(allTransacoes.filter(t => t.cartao !== 'Carteira' && (ano === null || (t.ano||0) === ano)).map(t => t.mesIdx))].sort((a,b) => a - b);
  const labels   = mesesPresentes.map(i => MESES_PT[i].substring(0, 3));
  const entradas = mesesPresentes.map(m => allTransacoes.filter(t => t.mov === 'entrada' && t.mesIdx === m && t.cartao !== 'Carteira' && (ano === null || (t.ano||0) === ano)).reduce((s,t) => s + t.valor, 0));
  const saidas   = mesesPresentes.map(m => allTransacoes.filter(t => (t.mov||'saida') === 'saida' && t.mesIdx === m && t.cartao !== 'Carteira' && (ano === null || (t.ano||0) === ano)).reduce((s,t) => s + t.valor, 0));
  const lancCarteira = allTransacoes.filter(t => t.cartao === 'Carteira' && t.mesIdx === 0 && (ano === null || (t.ano||0) === ano));
  let acum = lancCarteira.reduce((s,t) => t.mov === 'entrada' ? s + t.valor : s - t.valor, 0);
  const carteira = mesesPresentes.map((m, i) => { acum += entradas[i] - saidas[i]; return Math.round(acum * 100) / 100; });

  if (charts.saldo) charts.saldo.destroy();
  charts.saldo = new Chart(document.getElementById('chartSaldo'), {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Entradas', data: entradas, backgroundColor: '#22c55e88', borderColor: '#22c55e', borderWidth: 1, borderRadius: 4 },
      { label: 'Saidas',   data: saidas,   backgroundColor: '#ef444488', borderColor: '#ef4444', borderWidth: 1, borderRadius: 4 },
      { label: 'Carteira', data: carteira, type: 'line', borderColor: '#22c55e', backgroundColor: '#22c55e18', tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#22c55e', yAxisID: 'y' },
    ]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e2e8f0' } }, tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.raw) } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: '#2d3148' } }, y: { ticks: { color: '#94a3b8', callback: v => 'R$ ' + v.toLocaleString('pt-BR') }, grid: { color: '#2d3148' } } } },
  });
}

function renderTabela(filtrado) {
  const sorted = [...filtrado].sort((a,b) => { const mA = a.mov||'saida', mB = b.mov||'saida'; if (mA !== mB) return mA === 'entrada' ? -1 : 1; return b.valor - a.valor; }).slice(0, 100);
  document.getElementById('tabelaBody').innerHTML = sorted.map(t => {
    const cor = corTipo(t.tipo, t.mov||'saida');
    const mov = t.mov||'saida';
    const vc  = mov === 'entrada' ? '#22c55e' : '#ef4444';
    return '<tr><td>' + (mov === 'entrada' ? 'E' : 'S') + '</td><td>' + t.cartao + '</td><td>' + (t.ano||'-') + '</td><td>' + t.mes + '</td><td>' + t.descricao + '</td>' +
      '<td><span class="badge" style="background:' + cor + '22;color:' + cor + '">' + t.tipo + '</span></td>' +
      '<td>' + (t.venc||'-') + '</td><td style="text-align:right;font-weight:600;color:' + vc + '">' + fmt(t.valor) + '</td></tr>';
  }).join('');
}

// ── INIT ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const vEl = document.getElementById('navVersion');
  if (vEl) vEl.textContent = 'v' + (window.appVersion || '3.0.0');
  updateNavUser();
  init();
});
