// Serviço de Doações — operações CRUD reais contra a API do HemoCore.
// Contrato (ver docs/API_DOACOES.md):
//   GET    /doacoes
//   GET    /doacoes/:id
//   POST   /doacoes      body: { data, quantia, doador:{id}, enfermeiro:{id}, unidadeColeta:{id} }
//   PUT    /doacoes/:id   body: idem
//   DELETE /doacoes/:id
import { apiClient } from './apiClient';

/**
 * Monta o corpo exatamente como o backend espera.
 * O DoacaoService do backend lê `doador.id`, `enfermeiro.id` e `unidadeColeta.id`,
 * portanto enviamos objetos aninhados. `quantia` (não "quantidade") é inteiro 450|500.
 * Sem inventar campos.
 */
function toPayload(form) {
  return {
    data: form.data,
    quantia: Number(form.quantia),
    doador: { id: Number(form.doadorId) },
    enfermeiro: { id: Number(form.enfermeiroId) },
    unidadeColeta: { id: Number(form.unidadeColetaId) },
  };
}

export const doacaoService = {
  listar: (opts) => apiClient.get('/doacoes', opts),
  obter: (id, opts) => apiClient.get(`/doacoes/${id}`, opts),
  criar: (form, opts) => apiClient.post('/doacoes', toPayload(form), opts),
  atualizar: (id, form, opts) => apiClient.put(`/doacoes/${id}`, toPayload(form), opts),
  remover: (id, opts) => apiClient.delete(`/doacoes/${id}`, opts),
};
