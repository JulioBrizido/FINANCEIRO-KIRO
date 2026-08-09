/**
 * utils.js — funções utilitárias puras (sem dependência de DOM ou IndexedDB)
 * Podem ser importadas tanto pelos HTMLs quanto pelos testes.
 */

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

/**
 * Formata um número como moeda BRL.
 * @param {number} v
 * @returns {string}
 */
function fmt(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata uma data ISO "yyyy-mm-dd" para "dd/mm/yyyy".
 * Retorna "—" se vazio/nulo.
 * @param {string} data
 * @returns {string}
 */
function formatarData(data) {
  if (!data) return '—';
  return data.split('-').reverse().join('/');
}

/**
 * Gera as parcelas de um lançamento parcelado.
 * @param {{ mov, cartao, ano, mesIdx, descricao, tipo, venc, data, valor }} base
 * @param {number} parc  Número de parcelas (≥ 2)
 * @returns {Array} Lista de objetos prontos para dbAdd
 */
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

/**
 * Filtra uma lista de lançamentos com base nos critérios fornecidos.
 * @param {Array}  lista
 * @param {{ movF, mesF, anoF, cartaoF, tipoF, busca }} filtros
 * @returns {Array}
 */
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

/**
 * Ordena uma lista de lançamentos.
 * @param {Array}  lista
 * @param {'valor'|'data'} campo
 * @param {'asc'|'desc'}   dir
 * @returns {Array} Nova lista ordenada (não muta o original)
 */
function ordenarLancamentos(lista, campo = 'valor', dir = 'desc') {
  return [...lista].sort((a, b) => {
    const ma = a.mov || 'saida', mb = b.mov || 'saida';
    if (ma !== mb) return ma === 'entrada' ? -1 : 1;

    if (campo === 'data') {
      const da = a.data || '', db = b.data || '';
      if (da !== db) return dir === 'desc' ? db.localeCompare(da) : da.localeCompare(db);
    }

    // Fallback: ano desc, mês desc, valor
    if ((b.ano || 0) !== (a.ano || 0)) return (b.ano || 0) - (a.ano || 0);
    if (b.mesIdx !== a.mesIdx) return b.mesIdx - a.mesIdx;
    return dir === 'desc' ? b.valor - a.valor : a.valor - b.valor;
  });
}

/**
 * Calcula totais de entradas, saídas e saldo de uma lista.
 * @param {Array} lista
 * @returns {{ entradas: number, saidas: number, saldo: number }}
 */
function calcularTotais(lista) {
  const entradas = lista.filter(t => t.mov === 'entrada').reduce((s, t) => s + t.valor, 0);
  const saidas   = lista.filter(t => (t.mov || 'saida') === 'saida').reduce((s, t) => s + t.valor, 0);
  return { entradas, saidas, saldo: entradas - saidas };
}

/**
 * Calcula o saldo acumulado da carteira até um determinado mês/ano.
 * @param {Array}  transacoes   Lista completa de lançamentos
 * @param {number} mesIdx       Mês filtrado (-1 = todos)
 * @param {number} anoFiltro    Ano filtrado (-1 = todos)
 * @returns {{ saldo: number, mesLimite: number }}
 */
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

/**
 * Calcula o label de preview de parcelas (valor/mês e mês final).
 * @param {number} parc    Número de parcelas
 * @param {number} valor   Valor total
 * @param {number} mesIdx  Índice do mês inicial (0–11)
 * @param {number} ano     Ano inicial
 * @returns {{ valorParcela: number, mesFim: number, anoFim: number, label: string } | null}
 *   null quando parc <= 1
 */
function calcularPreviewParc(parc, valor, mesIdx, ano) {
  if (parc <= 1) return null;
  const valorParcela = Math.round((valor / parc) * 100) / 100;
  const mesFim = (mesIdx + parc - 1) % 12;
  const anoFim = ano + Math.floor((mesIdx + parc - 1) / 12);
  return { valorParcela, mesFim, anoFim, label: MESES_PT[mesFim] + '/' + anoFim };
}

// Exporta para ESM (Vitest/Node)
export { MESES_PT, fmt, formatarData, gerarParcelas, filtrarLancamentos, ordenarLancamentos, calcularTotais, calcularSaldoCarteira, calcularPreviewParc };
