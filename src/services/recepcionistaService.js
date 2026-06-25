// Serviço de Recepcionistas — operações CRUD reais contra a API do HemoCore.
// Contrato (ver docs/API_RECEPCIONISTAS.md):
//   GET    /recepcionistas
//   GET    /recepcionistas/:id
//   POST   /recepcionistas      body: { nome, telefone, cpf, login, senha, cidade:{id} }
//   PUT    /recepcionistas/:id   body: idem (senha obrigatória — o backend sobrescreve tudo)
//   DELETE /recepcionistas/:id
import { apiClient } from './apiClient';

/**
 * Monta o corpo exatamente como o RecepcionistaService do backend espera.
 * O backend lê `cidade?.id` (objeto aninhado), portanto enviamos `cidade: { id }`
 * — sem inventar campos nem renomear propriedades.
 */
function toPayload(form) {
  return {
    nome: form.nome?.trim(),
    telefone: form.telefone?.trim(),
    cpf: form.cpf?.trim(),
    login: form.login?.trim(),
    senha: form.senha,
    cidade: { id: Number(form.cidadeId) },
  };
}

export const recepcionistaService = {
  listar: (opts) => apiClient.get('/recepcionistas', opts),
  obter: (id, opts) => apiClient.get(`/recepcionistas/${id}`, opts),
  criar: (form, opts) => apiClient.post('/recepcionistas', toPayload(form), opts),
  atualizar: (id, form, opts) => apiClient.put(`/recepcionistas/${id}`, toPayload(form), opts),
  remover: (id, opts) => apiClient.delete(`/recepcionistas/${id}`, opts),
};
