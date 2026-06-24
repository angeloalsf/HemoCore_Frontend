// Serviço de Relatórios — leitura real contra a API do HemoCore.
// Contrato (ver docs/API_RELATORIO_DOADORES_ATIVOS.md):
//   GET /doacoes/doadores-ativos?tipoSanguineo={id}&dataInicio={ISO}&dataFim={ISO}
//   → array de { nome, cpf, uf, tipoSanguineo, status, dataDoacao }
//   Backend já força status = 'APTO' e ordena por dataDoacao DESC.
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

export const relatorioService = {
  /** Doadores ativos (status APTO), ordenados por última doação (desc). */
  doadoresAtivos: (filtros, opts) =>
    apiClient.get(`/doacoes/doadores-ativos${buildQuery(filtros)}`, opts),
};
