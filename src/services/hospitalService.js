// Serviço de Hospitais — operações CRUD reais contra a API do HemoCore.
// Contrato (ver docs/API_HOSPITAIS.md):
//   GET    /hospitais
//   GET    /hospitais/:id
//   POST   /hospitais      body: { nome, sigla, telefone, CNPJ, tipo, cidade:{id} }
//   PUT    /hospitais/:id   body: idem
//   DELETE /hospitais/:id
import { apiClient } from './apiClient';

/**
 * Monta o corpo exatamente como o backend espera.
 * O HospitalService do backend lê `CNPJ` (maiúsculo) e `cidade?.id`,
 * portanto enviamos `CNPJ` e o objeto aninhado `cidade` — sem inventar campos.
 * A resposta, por outro lado, devolve `cnpj` (minúsculo).
 */
function toPayload(form) {
  return {
    nome: form.nome?.trim(),
    sigla: form.sigla?.trim(),
    telefone: form.telefone?.trim(),
    CNPJ: form.cnpj?.trim(),
    tipo: form.tipo,
    cidade: { id: Number(form.cidadeId) },
  };
}

export const hospitalService = {
  listar: (opts) => apiClient.get('/hospitais', opts),
  obter: (id, opts) => apiClient.get(`/hospitais/${id}`, opts),
  criar: (form, opts) => apiClient.post('/hospitais', toPayload(form), opts),
  atualizar: (id, form, opts) => apiClient.put(`/hospitais/${id}`, toPayload(form), opts),
  remover: (id, opts) => apiClient.delete(`/hospitais/${id}`, opts),
};
