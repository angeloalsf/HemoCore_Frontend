// Serviço de Unidades de Coleta — operações CRUD reais contra a API do HemoCore.
// Contrato (ver docs/API_UNIDADES_COLETA.md):
//   GET    /unidades-coleta
//   GET    /unidades-coleta/:id
//   POST   /unidades-coleta      body: { nome, tipo_unidade, telefone, cidade:{id} }
//   PUT    /unidades-coleta/:id   body: idem
//   DELETE /unidades-coleta/:id   (204 No Content)
import { apiClient } from './apiClient';

/**
 * Monta o corpo exatamente como o backend espera.
 * O UnidadeColetaService desestrutura { nome, tipo_unidade, telefone, cidade }
 * e grava `cidadeId: cidade?.id` — por isso enviamos o objeto aninhado `cidade`,
 * o enum `tipo_unidade` (FIXA | MÓVEL) e nada além disso. Sem inventar campos.
 */
function toPayload(form) {
  return {
    nome: form.nome?.trim(),
    tipo_unidade: form.tipo_unidade,
    telefone: form.telefone?.trim(),
    cidade: { id: Number(form.cidadeId) },
  };
}

export const unidadeColetaService = {
  listar: (opts) => apiClient.get('/unidades-coleta', opts),
  obter: (id, opts) => apiClient.get(`/unidades-coleta/${id}`, opts),
  criar: (form, opts) => apiClient.post('/unidades-coleta', toPayload(form), opts),
  atualizar: (id, form, opts) => apiClient.put(`/unidades-coleta/${id}`, toPayload(form), opts),
  remover: (id, opts) => apiClient.delete(`/unidades-coleta/${id}`, opts),
};
