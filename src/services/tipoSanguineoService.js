import { apiClient } from './apiClient';

function buildPayload(form) {
  return {
    grupoABO: form.grupo,
    fatorRH: form.rh === 'Rh(+)',
    quantidade: parseInt(form.quantidade, 10),
    descricao: form.desc || null,
  };
}

export const tipoSanguineoService = {
  listar: (opts) => apiClient.get('/tipos-sanguineos', opts),
  criar: (form) => apiClient.post('/tipos-sanguineos', buildPayload(form)),
  atualizar: (id, form) => apiClient.put(`/tipos-sanguineos/${id}`, buildPayload(form)),
  remover: (id) => apiClient.delete(`/tipos-sanguineos/${id}`),
};
