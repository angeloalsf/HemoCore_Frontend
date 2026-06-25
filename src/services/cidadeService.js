// Serviço de Cidades — operações CRUD reais contra a API do HemoCore.
// Contrato (ver docs/API_CIDADES.md):
//   GET    /cidades
//   GET    /cidades/:id
//   POST   /cidades      body: { nome, area, habitantes, uf:{id} }
//   PUT    /cidades/:id   body: idem
//   DELETE /cidades/:id   (204 No Content)
import { apiClient } from './apiClient';

/**
 * Monta o corpo exatamente como o backend espera.
 * O CidadeService do backend desestrutura { nome, area, habitantes, uf }
 * e grava `ufId: uf?.id` — por isso enviamos o objeto aninhado `uf`,
 * `habitantes` como inteiro e `area` como número. Sem inventar campos.
 */
function toPayload(form) {
  return {
    nome: form.nome?.trim(),
    habitantes: Number.parseInt(form.habitantes, 10),
    area: Number.parseFloat(form.area),
    uf: { id: Number(form.ufId) },
  };
}

export const cidadeService = {
  listar: (opts) => apiClient.get('/cidades', opts),
  obter: (id, opts) => apiClient.get(`/cidades/${id}`, opts),
  criar: (form, opts) => apiClient.post('/cidades', toPayload(form), opts),
  atualizar: (id, form, opts) => apiClient.put(`/cidades/${id}`, toPayload(form), opts),
  remover: (id, opts) => apiClient.delete(`/cidades/${id}`, opts),
};
