// Serviço de Doadores — operações CRUD reais contra a API do HemoCore.
// Contrato (ver docs/API_DOADORES.md):
//   GET    /doadores
//   GET    /doadores/:id
//   POST   /doadores      body: { nome, sexo, telefone, cpf, status, tipoSanguineo:{id}, cidade:{id} }
//   PUT    /doadores/:id   body: idem
//   DELETE /doadores/:id
import { apiClient } from './apiClient';

/**
 * Monta o corpo exatamente como o backend espera.
 * O DoadorService do backend lê `tipoSanguineo?.id` e `cidade?.id`,
 * portanto enviamos objetos aninhados — sem inventar campos.
 */
function toPayload(form) {
  return {
    nome: form.nome?.trim(),
    sexo: form.sexo,
    telefone: form.telefone?.trim(),
    cpf: form.cpf?.trim(),
    status: form.status,
    tipoSanguineo: { id: Number(form.tipoSanguineoId) },
    cidade: { id: Number(form.cidadeId) },
  };
}

export const doadorService = {
  listar: (opts) => apiClient.get('/doadores', opts),
  obter: (id, opts) => apiClient.get(`/doadores/${id}`, opts),
  criar: (form, opts) => apiClient.post('/doadores', toPayload(form), opts),
  atualizar: (id, form, opts) => apiClient.put(`/doadores/${id}`, toPayload(form), opts),
  remover: (id, opts) => apiClient.delete(`/doadores/${id}`, opts),
};
