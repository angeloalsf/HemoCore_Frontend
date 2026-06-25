// Serviço de Relatórios — leitura real contra a API do HemoCore.
// Contrato (ver docs/API_RELATORIO_DOADORES_ATIVOS.md):
//   GET /doacoes/doadores-ativos?tipoSanguineo={id}&dataInicio={ISO}&dataFim={ISO}
//   → array de { nome, cpf, uf, tipoSanguineo, status, dataDoacao }
//   Backend já força status = 'APTO' e ordena por dataDoacao DESC.
//
//   GET /doacoes/somatorio-por-tipo-sanguineo?dataInicio={ISO}&dataFim={ISO}
//   → array de { tipoSanguineo, total } — total é a CONTAGEM de doações,
//     já ordenado por total DESC. Ver docs/API_RELATORIO_SOMATORIO.md.
import { apiClient } from './apiClient';

/**
 * Monta a query string apenas com os filtros informados — sem inventar
 * parâmetros. `tipoSanguineo` é o id do tipo sanguíneo (não o rótulo).
 */
function buildQuery({ tipoSanguineo, dataInicio, dataFim } = {}) {
  const params = new URLSearchParams();
  if (tipoSanguineo != null && tipoSanguineo !== '') params.set('tipoSanguineo', tipoSanguineo);
  if (dataInicio) params.set('dataInicio', dataInicio);
  if (dataFim) params.set('dataFim', dataFim);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Normaliza um registro da API para o formato camelCase do contrato.
 *
 * O backend roda em PostgreSQL, que rebaixa para minúsculas os aliases de
 * coluna não escritos entre aspas. Assim, apesar do SQL declarar
 * `AS tipoSanguineo` e `AS dataDoacao`, a resposta chega com as chaves
 * `tiposanguineo` e `datadoacao`. Aqui reconciliamos ambas as grafias —
 * o operador `??` mantém compatibilidade caso o backend passe a devolver
 * camelCase no futuro.
 */
function normalizeDoadorAtivo(r) {
  if (!r || typeof r !== 'object') return r;
  return {
    ...r,
    tipoSanguineo: r.tipoSanguineo ?? r.tiposanguineo,
    dataDoacao: r.dataDoacao ?? r.datadoacao,
  };
}

/**
 * Reduz a lista a uma linha por doador, mantendo apenas a doação mais recente.
 *
 * A API faz `JOIN doacoes`, então a granularidade é uma linha por doação: um
 * doador apto com várias doações aparece repetido. Para o relatório "Doadores
 * Ativos" interessa só a última doação de cada um. Agrupamos por CPF e, em
 * caso de empate de chave, preservamos o registro com `dataDoacao` mais alta.
 * O resultado é reordenado por `dataDoacao` desc (mesma ordem do contrato).
 */
function manterUltimaDoacaoPorDoador(registros) {
  const porDoador = new Map();
  for (const r of registros) {
    const chave = r.cpf ?? r.nome;
    const atual = porDoador.get(chave);
    if (!atual || String(r.dataDoacao ?? '') > String(atual.dataDoacao ?? '')) {
      porDoador.set(chave, r);
    }
  }
  return [...porDoador.values()].sort(
    (a, b) => String(b.dataDoacao ?? '').localeCompare(String(a.dataDoacao ?? ''))
  );
}

/**
 * Normaliza um item do somatório por tipo sanguíneo.
 *
 * Mesmo motivo do `normalizeDoadorAtivo`: o PostgreSQL rebaixa o alias
 * `AS tipoSanguineo` para `tiposanguineo`. Além disso, o backend devolve
 * `total` como string descritiva ("3 Doações"); aqui extraímos a contagem
 * numérica em `totalDoacoes` para permitir formatação e ranqueamento no
 * cliente, preservando o `total` original para exibição direta.
 */
function normalizeSomatorio(r) {
  if (!r || typeof r !== 'object') return r;
  const total = r.total ?? '';
  const n = parseInt(String(total).replace(/\D+/g, ''), 10);
  return {
    tipoSanguineo: r.tipoSanguineo ?? r.tiposanguineo ?? '',
    total,
    totalDoacoes: Number.isFinite(n) ? n : 0,
  };
}

export const relatorioService = {
  /** Doadores ativos (status APTO) — uma linha por doador, com a última doação. */
  doadoresAtivos: async (filtros, opts) => {
    const data = await apiClient.get(`/doacoes/doadores-ativos${buildQuery(filtros)}`, opts);
    if (!Array.isArray(data)) return [];
    return manterUltimaDoacaoPorDoador(data.map(normalizeDoadorAtivo));
  },

  /**
   * Somatório de doações agrupado por tipo sanguíneo.
   * O backend já ordena por total desc; reordenamos pelo valor numérico
   * apenas como garantia caso a contagem chegue como string.
   */
  somatorioPorTipoSanguineo: async (filtros, opts) => {
    const data = await apiClient.get(`/doacoes/somatorio-por-tipo-sanguineo${buildQuery(filtros)}`, opts);
    if (!Array.isArray(data)) return [];
    return data.map(normalizeSomatorio).sort((a, b) => b.totalDoacoes - a.totalDoacoes);
  },
};
