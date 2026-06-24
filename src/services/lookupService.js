// Serviços de apoio para popular os selects dos formulários (Doador, Doação…).
// Tipos sanguíneos, cidades, UFs e enfermeiros vêm da própria API (sem mocks).
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

// Enfermeiros são relacionamento obrigatório da Doação (enfermeiro.id).
export const enfermeiroService = {
  listar: (opts) => apiClient.get('/enfermeiros', opts),
};

/** Rótulo do tipo sanguíneo: grupoABO + (fatorRH ? '+' : '-') — igual ao getModelVerboso do backend. */
export const tipoSanguineoLabel = (t) =>
  t ? `${t.grupoABO}${t.fatorRH ? '+' : '-'}` : '';
