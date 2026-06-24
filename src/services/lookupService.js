// Serviços de apoio para popular os selects do formulário de Doador.
// Tipos sanguíneos, cidades e UFs vêm da própria API (sem dados mockados).
import { apiClient } from './apiClient';

export const tipoSanguineoService = {
  listar: (opts) => apiClient.get('/tipos-sanguineos', opts),
};

export const cidadeService = {
  listar: (opts) => apiClient.get('/cidades', opts),
};

export const ufService = {
  listar: (opts) => apiClient.get('/ufs', opts),
};

/** Rótulo do tipo sanguíneo: grupoABO + (fatorRH ? '+' : '-') — igual ao getModelVerboso do backend. */
export const tipoSanguineoLabel = (t) =>
  t ? `${t.grupoABO}${t.fatorRH ? '+' : '-'}` : '';
