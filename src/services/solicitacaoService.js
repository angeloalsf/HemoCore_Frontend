// Serviço de Solicitações — operações CRUD reais contra a API do HemoCore.
// Contrato (ver docs/API_SOLICITACOES.md):
//   GET    /solicitacoes
//   GET    /solicitacoes/:id
//   POST   /solicitacoes      body: { data, status, urgencia, observacao, hospital:{id}, itensSolicitacao:[{ quantidade, tipoSanguineo:{id} }] }
//   PUT    /solicitacoes/:id   body: idem
//   DELETE /solicitacoes/:id
import { apiClient } from './apiClient';

/**
 * Monta o corpo exatamente como o backend espera.
 * O SolicitacaoService desestrutura { data, status, urgencia, observacao, hospital, itensSolicitacao }
 * e grava `hospitalId: hospital.id`; cada item usa `tipoSanguineoId: item.tipoSanguineo.id`.
 * Por isso enviamos os objetos aninhados `hospital:{id}` e `tipoSanguineo:{id}` — sem inventar campos.
 * `urgencia` CRÍTICA é definida apenas pelo backend (Regra de Negócio 2), nunca pelo cliente.
 */
function toPayload(form) {
  return {
    data: form.data,
    status: form.status,
    urgencia: form.urgencia,
    observacao: form.observacao?.trim() ? form.observacao.trim() : null,
    hospital: { id: Number(form.hospitalId) },
    itensSolicitacao: (form.itens || []).map((i) => ({
      quantidade: Number(i.quantidade),
      tipoSanguineo: { id: Number(i.tipoSanguineoId) },
    })),
  };
}

export const solicitacaoService = {
  listar: (opts) => apiClient.get('/solicitacoes', opts),
  obter: (id, opts) => apiClient.get(`/solicitacoes/${id}`, opts),
  criar: (form, opts) => apiClient.post('/solicitacoes', toPayload(form), opts),
  atualizar: (id, form, opts) => apiClient.put(`/solicitacoes/${id}`, toPayload(form), opts),
  remover: (id, opts) => apiClient.delete(`/solicitacoes/${id}`, opts),
};
