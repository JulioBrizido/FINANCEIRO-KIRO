/**
 * utils.browser.js — versão do utils.js para uso no browser via <script src="...">.
 * Sem export — as funções ficam no escopo global (window).
 * O utils.js original usa export ESM e é consumido pelos testes (Vitest).
 */

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

function fmt(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data) {
  if (!data) return '—';
  return data.split('-').reverse().join('/');
}

function gerarParcelas(base, parc) {
  const { mov, cartao, ano, mesIdx, descricao, tipo, venc, data, valor } = base;
  const vp = Math.round((valor / parc) * 100) / 100;
  const parcelas = [];
  for (let i = 0; i < parc; i++) {
    const mi        = (mesIdx + i) % 12;
    const avancoAno = Math.floor((mesIdx + i) / 12);
    parcelas.push({
      mov, cartao,
      ano: ano + avancoAno,
      mesIdx: mi,
      mes: MESES_PT[mi],
      descricao: descricao + ' (' + (i + 1) + '/' + parc + ')',
      tipo, venc, data,
      valor: vp,
    });
  }
  return parcelas;
}

function filtrarLancamentos(lista, { movF = 'todos', mesF = -1, anoF = -1, cartaoF = 'todos', tipoF = 'todos', busca = '' } = {}) {
  let resultado = lista;
  if (movF    !== 'todos') resultado = resultado.filter(t => (t.mov || 'saida') === movF);
  if (mesF    !== -1)      resultado = resultado.filter(t => t.mesIdx === mesF);
  if (anoF    !== -1)      resultado = resultado.filter(t => (t.ano || 0) === anoF);
  if (cartaoF !== 'todos') resultado = resultado.filter(t => t.cartao === cartaoF);
  if (tipoF   !== 'todos') {
    const [catMov, catNome] = tipoF.split('|');
    resultado = resultado.filter(t => t.tipo === catNome && (t.mov || 'saida') === catMov);
  }
  if (busca) resultado = resultado.filter(t => t.descricao.toLowerCase().includes(busca.toLowerCase().trim()));
  return resultado;
}

function ordenarLancamentos(lista, campo = 'valor', dir = 'desc') {
  return [...lista].sort((a, b) => {
    const ma = a.mov || 'saida', mb = b.mov || 'saida';
    if (ma !== mb) return ma === 'entrada' ? -1 : 1;
    if (campo === 'data') {
      const da = a.data || '', db = b.data || '';
      if (da !== db) return dir === 'desc' ? db.localeCompare(da) : da.localeCompare(db);
    }
    if ((b.ano || 0) !== (a.ano || 0)) return (b.ano || 0) - (a.ano || 0);
    if (b.mesIdx !== a.mesIdx) return b.mesIdx - a.mesIdx;
    return dir === 'desc' ? b.valor - a.valor : a.valor - b.valor;
  });
}

function calcularTotais(lista) {
  const entradas = lista.filter(t => t.mov === 'entrada').reduce((s, t) => s + t.valor, 0);
  const saidas   = lista.filter(t => (t.mov || 'saida') === 'saida').reduce((s, t) => s + t.valor, 0);
  return { entradas, saidas, saldo: entradas - saidas };
}

function calcularSaldoCarteira(transacoes, mesIdx, anoFiltro) {
  const ano = anoFiltro !== -1 ? anoFiltro : null;
  const lancCarteira = transacoes.filter(t =>
    t.cartao === 'Carteira' && t.mesIdx === 0 && (ano === null || (t.ano||0) === ano)
  );
  const saldoInicial = lancCarteira.reduce((s,t) =>
    t.mov === 'entrada' ? s + t.valor : s - t.valor, 0);

  let mesLimite;
  if (mesIdx !== -1) {
    mesLimite = mesIdx;
  } else {
    const transAno = transacoes.filter(t =>
      t.cartao !== 'Carteira' && (ano === null || (t.ano||0) === ano));
    const meses = [...new Set(transAno.map(t => t.mesIdx))].sort((a,b) => a - b);
    mesLimite = meses.length > 0 ? meses[meses.length - 1] : 0;
  }

  let saldo = saldoInicial;
  for (let m = 0; m <= mesLimite; m++) {
    const trans = transacoes.filter(t =>
      t.cartao !== 'Carteira' && t.mesIdx === m && (ano === null || (t.ano||0) === ano)
    );
    saldo += trans.filter(t => t.mov === 'entrada').reduce((s,t) => s + t.valor, 0) -
             trans.filter(t => (t.mov||'saida') === 'saida').reduce((s,t) => s + t.valor, 0);
  }

  return { saldo, mesLimite };
}

function calcularPreviewParc(parc, valor, mesIdx, ano) {
  if (parc <= 1) return null;
  const valorParcela = Math.round((valor / parc) * 100) / 100;
  const mesFim = (mesIdx + parc - 1) % 12;
  const anoFim = ano + Math.floor((mesIdx + parc - 1) / 12);
  return { valorParcela, mesFim, anoFim, label: MESES_PT[mesFim] + '/' + anoFim };
}
