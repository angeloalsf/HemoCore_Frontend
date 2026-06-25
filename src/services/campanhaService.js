// Serviço de Campanhas — operações CRUD reais contra a API do HemoCore.
// Contrato (ver docs/API_CAMPANHAS.md):
//   GET    /campanhas
//   GET    /campanhas/:id
//   POST   /campanhas      body: { nome, data, unidadeColeta:{id}, itensCampanha:[{ metaColeta, quantiaColetada, tipoSanguineo:{id} }] }
//   PUT    /campanhas/:id   body: idem
//   DELETE /campanhas/:id   (200 com o objeto removido)
import { apiClient } from './apiClient';

/**
 * Monta o corpo exatamente como o CampanhaService do backend espera.
 * Ele desestrutura { nome, data, unidadeColeta, itensCampanha } e lê
 * `unidadeColeta.id`, `item.metaColeta`, `item.quantiaColetada` e
 * `item.tipoSanguineo.id`. Por isso enviamos os objetos aninhados
 * `unidadeColeta` e `tipoSanguineo` — sem inventar campos nem enviar ids dos itens.
 */
function toPayload(form) {
  return {
    nome: form.nome?.trim(),
    data: form.data,
    unidadeColeta: { id: Number(form.unidadeColetaId) },
    itensCampanha: (form.itens || []).map((it) => ({
      metaColeta: Number(it.metaColeta),
      quantiaColetada: Number(it.quantiaColetada) || 0,
      tipoSanguineo: { id: Number(it.tipoSanguineoId) },
    })),
  };
}

export const campanhaService = {
  listar: (opts) => apiClient.get('/campanhas', opts),
  obter: (id, opts) => apiClient.get(`/campanhas/${id}`, opts),
  criar: (form, opts) => apiClient.post('/campanhas', toPayload(form), opts),
  atualizar: (id, form, opts) => apiClient.put(`/campanhas/${id}`, toPayload(form), opts),
  remover: (id, opts) => apiClient.delete(`/campanhas/${id}`, opts),
};
