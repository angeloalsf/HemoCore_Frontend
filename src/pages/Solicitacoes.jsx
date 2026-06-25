import React, { useState, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import StatCard from '../components/common/StatCard';
import { TableCard, EmptyState, ActionBtn, SearchInput, FilterSelect, Pagination } from '../components/common/TableCard';
import AlertBox from '../components/common/AlertBox';
import FormField, { FormSectionLabel, AutoIdField, baseInputStyle } from '../components/common/FormField';
import { useAlert } from '../hooks/useAlert';
import { useBsModal } from '../hooks/useBsModal';
import { useSolicitacoes } from '../hooks/useSolicitacoes';
import { tipoSanguineoLabel } from '../services/lookupService';
import { ApiError } from '../services/apiClient';
import { formatDate, today } from '../utils/validation';

// Integração real com a API HemoCore — CRUD de Solicitações (sem mocks, sem dados locais).
// Enums reais da API (ver docs/API_SOLICITACOES.md). Rótulos amigáveis só na UI.

// Status — enum real EM ABERTO / FINALIZADA / CANCELADA
const STATUS = {
  'EM ABERTO': { label: 'Em Aberto', cls: 'bg-primary-subtle text-primary-emphasis' },
  'FINALIZADA': { label: 'Finalizada', cls: 'bg-success-subtle text-success' },
  'CANCELADA': { label: 'Cancelada', cls: 'bg-danger-subtle text-danger' },
};
const STATUS_OPTIONS = [
  { value: 'EM ABERTO', label: 'Em Aberto' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];
const statusLabel = (s) => STATUS[s]?.label ?? s;
const statusCls = (s) => STATUS[s]?.cls ?? 'bg-body-secondary text-dark';

// Urgência — enum real BAIXA / MÉDIA / ALTA / CRÍTICA.
// CRÍTICA é atribuída pelo sistema (Regra de Negócio 2): não é oferecida no select,
// apenas exibida quando retornada pela API.
const URGENCIA = {
  'BAIXA': { label: 'Baixa', cls: 'bg-success-subtle text-success' },
  'MÉDIA': { label: 'Média', cls: 'bg-warning-subtle text-warning-emphasis' },
  'ALTA': { label: 'Alta', cls: 'bg-danger-subtle text-danger' },
  'CRÍTICA': { label: 'Crítica', cls: 'bg-danger text-white' },
};
const URGENCIA_OPTIONS = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'MÉDIA', label: 'Média' },
  { value: 'ALTA', label: 'Alta' },
];
const urgenciaLabel = (u) => URGENCIA[u]?.label ?? u;
const urgenciaCls = (u) => URGENCIA[u]?.cls ?? 'bg-body-secondary text-dark';

const itensStr = (its) =>
  (its || [])
    .map((i) => `${tipoSanguineoLabel(i.tipoSanguineo)}: ${Number(i.quantidade).toLocaleString('pt-BR')}mL`)
    .join(' · ') || '—';

const EMPTY_FORM = { hospitalId: '', data: today(), status: 'EM ABERTO', urgencia: 'BAIXA', observacao: '' };

function validate(form, itens) {
  const e = {};
  if (!form.hospitalId) e.hospitalId = 'Selecione o hospital.';
  if (!form.data) e.data = 'Data é obrigatória.';
  if (!itens.length) e.itens = 'Adicione pelo menos um item à solicitação.';
  return e;
}

export default function Solicitacoes() {
  const {
    solicitacoes, hospitais, tiposSanguineos,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  } = useSolicitacoes();

  const [editing, setEditing] = useState(null);          // solicitação em edição (ou null)
  const [deletingTarget, setDeletingTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [itens, setItens] = useState([]);                // [{ tipoSanguineoId, quantidade }]
  const [itemTipo, setItemTipo] = useState('');
  const [itemQtd, setItemQtd] = useState(500);
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUrg, setFilterUrg] = useState('');
  const { alert, showAlert } = useAlert();
  const modal = useBsModal();
  const delModal = useBsModal();
  const viewModal = useBsModal();

  // Estoque disponível do tipo sanguíneo selecionado no adicionador de itens —
  // atualiza automaticamente a interface após a seleção do tipo sanguíneo.
  const tipoSelecionado = useMemo(
    () => tiposSanguineos.find((t) => String(t.id) === String(itemTipo)) || null,
    [tiposSanguineos, itemTipo]
  );
  const estoqueDisponivel = tipoSelecionado ? Number(tipoSelecionado.quantidade) : null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return solicitacoes.filter((s) => {
      const hospitalNome = s.hospital?.nome ?? '';
      const matchSearch =
        hospitalNome.toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        (s.observacao ?? '').toLowerCase().includes(q);
      const matchStatus = !filterStatus || s.status === filterStatus;
      const matchUrg = !filterUrg || s.urgencia === filterUrg;
      return matchSearch && matchStatus && matchUrg;
    });
  }, [solicitacoes, search, filterStatus, filterUrg]);

  const openCreate = () => {
    if (busy) return;
    setEditing(null);
    setForm(EMPTY_FORM);
    setItens([]);
    setFormErrors({});
    setItemTipo('');
    setItemQtd(500);
    modal.show();
  };

  const openEdit = (s) => {
    if (busy) return;
    setEditing(s);
    setForm({
      hospitalId: String(s.hospitalId ?? s.hospital?.id ?? ''),
      data: s.data ?? today(),
      status: s.status ?? 'EM ABERTO',
      // Urgência CRÍTICA não é selecionável; ao editar, cai para ALTA no select.
      urgencia: s.urgencia === 'CRÍTICA' ? 'ALTA' : (s.urgencia ?? 'BAIXA'),
      observacao: s.observacao ?? '',
    });
    setItens((s.itensSolicitacao || []).map((i) => ({
      tipoSanguineoId: String(i.tipoSanguineoId ?? i.tipoSanguineo?.id ?? ''),
      quantidade: Number(i.quantidade),
    })));
    setFormErrors({});
    setItemTipo('');
    setItemQtd(500);
    modal.show();
  };

  const openView = (s) => { setViewTarget(s); viewModal.show(); };

  const addItem = () => {
    const qty = parseInt(itemQtd, 10);
    if (!itemTipo || !qty || qty < 1) {
      setFormErrors((p) => ({ ...p, itemAdd: 'Selecione o tipo sanguíneo e informe a quantidade (mín. 1 mL).' }));
      return;
    }
    // Valida contra o estoque disponível (Regra de Negócio 1) considerando o que já foi adicionado.
    const jaAdicionado = itens
      .filter((i) => String(i.tipoSanguineoId) === String(itemTipo))
      .reduce((acc, i) => acc + Number(i.quantidade), 0);
    if (estoqueDisponivel != null && jaAdicionado + qty > estoqueDisponivel) {
      setFormErrors((p) => ({
        ...p,
        itemAdd: `Estoque insuficiente: disponível ${estoqueDisponivel.toLocaleString('pt-BR')} mL${jaAdicionado ? ` (${jaAdicionado.toLocaleString('pt-BR')} mL já adicionados)` : ''}.`,
      }));
      return;
    }
    setFormErrors((p) => ({ ...p, itemAdd: '', itens: '' }));
    setItens((p) => [...p, { tipoSanguineoId: String(itemTipo), quantidade: qty }]);
    setItemTipo('');
    setItemQtd(500);
  };

  const save = async () => {
    const errs = validate(form, itens);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    const payloadForm = { ...form, itens };
    try {
      if (editing) {
        await atualizar(editing.id, payloadForm);
        showAlert('success', `Solicitação <strong>#${editing.id}</strong> atualizada!`);
      } else {
        await criar(payloadForm);
        showAlert('success', 'Solicitação criada com sucesso!');
      }
      modal.hide();
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao salvar solicitação.';
      showAlert('danger', msg);
    }
  };

  const openDelete = (s) => { if (busy) return; setDeletingTarget(s); delModal.show(); };
  const confirmDelete = async () => {
    if (!deletingTarget) return;
    try {
      await remover(deletingTarget.id);
      showAlert('warning', `Solicitação <strong>#${deletingTarget.id}</strong> removida.`);
      delModal.hide();
      setDeletingTarget(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao remover solicitação.';
      showAlert('danger', msg);
      delModal.hide();
    }
  };

  const tipoLabelById = (id) => tipoSanguineoLabel(tiposSanguineos.find((t) => String(t.id) === String(id)));

  const emAberto = solicitacoes.filter((s) => s.status === 'EM ABERTO').length;
  const finalizada = solicitacoes.filter((s) => s.status === 'FINALIZADA').length;
  const alta = solicitacoes.filter((s) => s.urgencia === 'ALTA' || s.urgencia === 'CRÍTICA').length;

  return (
    <PageLayout title="Solicitações" subtitle="Gerenciamento de solicitações de sangue"
      action={
        <button className="btn btn-danger text-white fw-semibold d-inline-flex align-items-center gap-2 py-1 px-3 border-0 shadow-sm"
          style={{ fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }} onClick={openCreate} disabled={busy}>
          <i className="bi bi-plus-lg"></i><span className="d-none d-sm-inline">Nova Solicitação</span>
        </button>
      }>

      <div className="row row-cols-2 row-cols-lg-4 g-2 g-sm-3 mb-3 mb-sm-4">
        <StatCard icon="bi-file-earmark-medical-fill" value={solicitacoes.length.toLocaleString('pt-BR')} label="Total" bgColor="#EBF5FB" iconColor="#2980B9" />
        <StatCard icon="bi-clock-fill" value={emAberto} label="Em Aberto" bgColor="#FEF9E7" iconColor="#D4AC0D" />
        <StatCard icon="bi-check-circle-fill" value={finalizada} label="Finalizadas" bgColor="#EAFAF1" iconColor="#27AE60" />
        <StatCard icon="bi-exclamation-triangle-fill" value={alta} label="Alta Urgência" bgColor="#FDECEA" iconColor="#C0392B" />
      </div>

      <AlertBox alert={alert} />

      {loadError && (
        <div className="alert bg-danger-subtle text-danger border border-danger-subtle d-flex align-items-center justify-content-between gap-2 py-2 px-3 shadow-sm mb-3"
          style={{ borderRadius: 10, fontSize: 13 }}>
          <span><i className="bi bi-exclamation-triangle-fill me-2"></i>{loadError}</span>
          <button className="btn btn-sm btn-danger text-white fw-semibold border-0" style={{ borderRadius: 8, fontSize: 12 }}
            onClick={carregar} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1"></i>Tentar novamente
          </button>
        </div>
      )}

      <TableCard title="Lista de Solicitações" count={filtered.length}
        filters={<>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar solicitação…" />
          <FilterSelect value={filterStatus} onChange={setFilterStatus} options={[
            { value: '', label: 'Todos os status' },
            ...STATUS_OPTIONS,
          ]} />
          <FilterSelect value={filterUrg} onChange={setFilterUrg} options={[
            { value: '', label: 'Todas urgências' },
            ...URGENCIA_OPTIONS,
            { value: 'CRÍTICA', label: 'Crítica' },
          ]} />
        </>}
        footer={<Pagination current={1} total={filtered.length} onPrev={() => {}} onNext={() => {}} />}>

        {loading ? (
          <div className="text-center text-secondary py-5 px-3" style={{ fontSize: 13.5 }}>
            <div className="spinner-border text-danger mb-2" role="status" style={{ width: 28, height: 28 }}>
              <span className="visually-hidden">Carregando…</span>
            </div>
            <div>Carregando solicitações…</div>
          </div>
        ) : (<>
          <div className="table-responsive d-none d-md-block">
            <table className="table table-borderless table-hover mb-0" style={{ fontSize: 13 }}>
              <thead>
                <tr className="table-header-cell">
                  {['ID', 'Hospital', 'Data', 'Status', 'Urgência', 'Itens', 'Ações'].map((h, i) => (
                    <th key={h} className={`py-2 px-3 fw-bold text-nowrap${i === 6 ? ' text-end' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan={7} className="p-0 border-0"><EmptyState message="Nenhuma solicitação encontrada." /></td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className="align-middle">
                    <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">{s.id}</span></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle"><strong className="text-dark">{s.hospital?.nome ?? '—'}</strong></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{formatDate(s.data)}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <span className={`fw-semibold rounded-pill ${statusCls(s.status)}`} style={{ fontSize: 11, padding: '2px 9px' }}>{statusLabel(s.status)}</span>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <span className={`fw-semibold rounded ${urgenciaCls(s.urgencia)}`} style={{ fontSize: 11, padding: '2px 8px' }}>{urgenciaLabel(s.urgencia)}</span>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-secondary"
                      style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {itensStr(s.itensSolicitacao)}
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <ActionBtn icon="bi-eye" color="#718096" onClick={() => openView(s)} title="Ver" />
                        <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(s)} title="Editar" />
                        <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(s)} title="Excluir" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-column d-md-none">
            {!filtered.length ? <EmptyState message="Nenhuma solicitação encontrada." /> :
              filtered.map((s, i) => (
                <div key={s.id} className={`p-3 d-flex align-items-start gap-2${i !== filtered.length - 1 ? ' border-bottom border-light-subtle' : ''}`}>
                  <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 38, height: 38, background: '#EBF5FB', color: '#2980B9', fontSize: 15 }}><i className="bi bi-file-earmark-medical-fill"></i></div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="id-badge mb-1">{s.id}</div>
                    <div className="fw-bold text-dark" style={{ fontSize: 13.5 }}>{s.hospital?.nome ?? '—'}</div>
                    <div className="text-secondary mt-1 text-truncate" style={{ fontSize: 11.5 }}>{formatDate(s.data)} · {itensStr(s.itensSolicitacao)}</div>
                    <div className="d-flex flex-wrap gap-1 mt-2">
                      <span className={`fw-semibold rounded-pill ${statusCls(s.status)}`} style={{ fontSize: 11, padding: '2px 9px' }}>{statusLabel(s.status)}</span>
                      <span className={`fw-semibold rounded ${urgenciaCls(s.urgencia)}`} style={{ fontSize: 11, padding: '2px 8px' }}>{urgenciaLabel(s.urgencia)}</span>
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <ActionBtn icon="bi-eye" color="#718096" onClick={() => openView(s)} title="Ver" />
                    <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(s)} title="Editar" />
                    <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(s)} title="Excluir" />
                  </div>
                </div>
              ))
            }
          </div>
        </>)}
      </TableCard>

      {/* Modal Criar/Editar */}
      <div className="modal fade" tabIndex="-1" aria-hidden="true" ref={modal.ref}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-header border-bottom border-light-subtle p-3 p-sm-4">
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: 15 }}>{editing ? 'Editar Solicitação' : 'Nova Solicitação'}</div>
                <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                  {editing ? `Editando: #${editing.id}` : 'Registre uma nova solicitação de sangue.'}
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => { modal.hide(); setFormErrors({}); }} disabled={saving}></button>
            </div>
            <div className="modal-body p-3 p-sm-4">
              <FormSectionLabel>Identificação</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-3"><AutoIdField /></div>
                <div className="col-12 col-md-5">
                  <FormField label="Hospital" required error={formErrors.hospitalId}>
                    <select className="form-select focus-ring-danger text-dark" value={form.hospitalId}
                      onChange={(e) => setForm((p) => ({ ...p, hospitalId: e.target.value }))}
                      style={baseInputStyle(formErrors.hospitalId)} disabled={saving}>
                      <option value="">Selecione…</option>
                      {hospitais.map((h) => <option key={h.id} value={h.id}>{h.nome}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField label="Data" required error={formErrors.data}>
                    <input type="date" className="form-control focus-ring-danger text-dark" value={form.data}
                      onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
                      style={baseInputStyle(formErrors.data)} disabled={saving} />
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Classificação</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6">
                  <FormField label="Status" required>
                    <select className="form-select focus-ring-danger text-dark" value={form.status}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} style={baseInputStyle()} disabled={saving}>
                      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="col-12 col-sm-6">
                  <FormField label="Urgência" required hint="A urgência CRÍTICA é atribuída automaticamente pelo sistema.">
                    <select className="form-select focus-ring-danger text-dark" value={form.urgencia}
                      onChange={(e) => setForm((p) => ({ ...p, urgencia: e.target.value }))} style={baseInputStyle()} disabled={saving}>
                      {URGENCIA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Itens Solicitados</FormSectionLabel>
              <div className="border border-light-subtle overflow-hidden mb-1" style={{ borderRadius: 10 }}>
                <div className="bg-light border-bottom border-light-subtle d-flex flex-wrap align-items-center gap-2 py-2 px-3">
                  <select className="form-select flex-grow-1" value={itemTipo} onChange={(e) => { setItemTipo(e.target.value); setFormErrors((p) => ({ ...p, itemAdd: '' })); }}
                    style={{ minWidth: 140, height: 34, fontSize: 13, padding: '4px 10px', borderRadius: 6 }} disabled={saving}>
                    <option value="">Tipo sanguíneo…</option>
                    {tiposSanguineos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {tipoSanguineoLabel(t)} — estoque {Number(t.quantidade).toLocaleString('pt-BR')} mL
                      </option>
                    ))}
                  </select>
                  <input type="number" value={itemQtd} min={1} step={50} placeholder="mL"
                    onChange={(e) => setItemQtd(e.target.value)}
                    className="form-control flex-shrink-0" style={{ width: 90, height: 34, fontSize: 13, padding: '4px 10px', borderRadius: 6 }} disabled={saving} />
                  <button className="btn btn-danger d-flex align-items-center gap-1 flex-shrink-0" onClick={addItem} disabled={saving}
                    style={{ height: 34, borderRadius: 6, padding: '0 12px', fontSize: 13, fontWeight: 600 }}>
                    <i className="bi bi-plus-lg"></i> Adicionar
                  </button>
                </div>
                {/* Estoque disponível do tipo selecionado — atualiza ao escolher o tipo sanguíneo */}
                {tipoSelecionado && (
                  <div className="px-3 py-1 d-flex align-items-center gap-2" style={{ fontSize: 11.5 }}>
                    <span className="text-secondary">Estoque disponível de <strong className="text-dark">{tipoSanguineoLabel(tipoSelecionado)}</strong>:</span>
                    <span className={`fw-bold ${estoqueDisponivel > 0 ? 'text-success' : 'text-danger'}`}>
                      {estoqueDisponivel.toLocaleString('pt-BR')} mL
                    </span>
                  </div>
                )}
                {formErrors.itemAdd && <div className="text-danger px-3 py-1" style={{ fontSize: 11.5 }}>{formErrors.itemAdd}</div>}
                <div className="d-flex flex-column gap-2 p-3" style={{ minHeight: 48 }}>
                  {!itens.length ? (
                    <div className="text-center text-secondary py-2" style={{ fontSize: 12.5 }}>Nenhum item adicionado.</div>
                  ) : itens.map((item, i) => (
                    <div key={i} className="d-flex align-items-center justify-content-between bg-white border border-light-subtle rounded-2 py-2 px-3 shadow-sm" style={{ fontSize: 13 }}>
                      <span><span className="fw-semibold text-dark">Sangue: {tipoLabelById(item.tipoSanguineoId)}</span><span className="text-danger fw-bold ms-2" style={{ fontSize: 12 }}>· {Number(item.quantidade).toLocaleString('pt-BR')} mL</span></span>
                      <button className="btn btn-link text-secondary p-0 border-0 d-flex align-items-center text-decoration-none" onClick={() => setItens((p) => p.filter((_, j) => j !== i))} disabled={saving}>
                        <i className="bi bi-x-lg" style={{ fontSize: 14 }}></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {formErrors.itens && <div className="text-danger mb-3" style={{ fontSize: 11.5 }}><i className="bi bi-exclamation-circle-fill me-1"></i>{formErrors.itens}</div>}
              <div className="text-secondary mb-4" style={{ fontSize: 11.5 }}>* Adicione pelo menos um item sanguíneo à solicitação.</div>

              <FormSectionLabel>Observações</FormSectionLabel>
              <FormField label="Observação">
                <textarea className="form-control focus-ring-danger text-dark" value={form.observacao}
                  onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                  placeholder="Informações adicionais sobre a solicitação…" maxLength={500}
                  style={{ borderColor: '#E2E8F0', borderRadius: 8, fontSize: 13.5, padding: '8px 12px', resize: 'vertical', minHeight: 80 }} disabled={saving} />
              </FormField>
            </div>
            <div className="modal-footer border-top border-light-subtle p-3 p-sm-4 d-flex justify-content-end gap-2"
              style={{ background: '#FAFBFC', borderRadius: '0 0 16px 16px' }}>
              <button className="btn btn-outline-secondary bg-white fw-semibold text-dark"
                onClick={() => { modal.hide(); setFormErrors({}); }} disabled={saving}
                style={{ borderColor: '#E2E8F0', borderRadius: 8, padding: '7px 14px', fontSize: 13 }}>Cancelar</button>
              <button className="btn btn-danger fw-semibold d-inline-flex align-items-center gap-2 border-0 shadow-sm"
                onClick={save} disabled={saving} style={{ borderRadius: 8, padding: '7px 14px', fontSize: 13 }}>
                {saving ? (
                  <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> {editing ? 'Atualizando…' : 'Salvando…'}</>
                ) : (
                  <><i className="bi bi-floppy"></i> {editing ? 'Atualizar' : 'Salvar'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Ver */}
      <div className="modal fade" tabIndex="-1" aria-hidden="true" ref={viewModal.ref}>
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-header border-bottom border-light-subtle p-3 p-sm-4">
              <div className="fw-bold text-dark" style={{ fontSize: 15 }}>Detalhes da Solicitação</div>
              <button type="button" className="btn-close" onClick={() => viewModal.hide()}></button>
            </div>
            <div className="modal-body p-3 p-sm-4" style={{ fontSize: 13.5 }}>
              {viewTarget && (
                <div className="d-flex flex-column gap-3">
                  {[
                    { label: 'ID', val: `#${viewTarget.id}` },
                    { label: 'Hospital', val: viewTarget.hospital?.nome ?? '—' },
                    { label: 'Data', val: formatDate(viewTarget.data) },
                  ].map(({ label, val }) => (
                    <div key={label} className="d-flex flex-column gap-1">
                      <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: 10.5, letterSpacing: '.5px' }}>{label}</div>
                      <div className="text-dark fw-semibold">{val}</div>
                    </div>
                  ))}
                  <div className="d-flex gap-4">
                    <div className="d-flex flex-column gap-1">
                      <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: 10.5, letterSpacing: '.5px' }}>Status</div>
                      <span className={`fw-semibold rounded-pill ${statusCls(viewTarget.status)}`} style={{ fontSize: 11, padding: '2px 9px' }}>{statusLabel(viewTarget.status)}</span>
                    </div>
                    <div className="d-flex flex-column gap-1">
                      <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: 10.5, letterSpacing: '.5px' }}>Urgência</div>
                      <span className={`fw-semibold rounded ${urgenciaCls(viewTarget.urgencia)}`} style={{ fontSize: 11, padding: '2px 8px' }}>{urgenciaLabel(viewTarget.urgencia)}</span>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-2 border-top border-light-subtle pt-3 mt-1">
                    <div className="text-secondary fw-bold text-uppercase mb-1" style={{ fontSize: 10.5, letterSpacing: '.5px' }}>Itens Solicitados</div>
                    {(viewTarget.itensSolicitacao || []).length === 0 ? (
                      <div className="text-secondary" style={{ fontSize: 12.5 }}>Nenhum item.</div>
                    ) : viewTarget.itensSolicitacao.map((it) => (
                      <div key={it.id} className="d-flex align-items-center justify-content-between bg-light border border-light-subtle rounded py-2 px-3 shadow-sm" style={{ fontSize: 13 }}>
                        <span className="fw-semibold text-dark">Sangue: {tipoSanguineoLabel(it.tipoSanguineo)}</span>
                        <span className="text-danger fw-bold" style={{ fontSize: 12 }}>{Number(it.quantidade).toLocaleString('pt-BR')} mL</span>
                      </div>
                    ))}
                  </div>
                  {viewTarget.observacao && (
                    <div className="d-flex flex-column gap-1 border-top border-light-subtle pt-3 mt-1">
                      <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: 10.5, letterSpacing: '.5px' }}>Observações</div>
                      <div className="text-secondary" style={{ fontSize: 13, whiteSpace: 'pre-line' }}>{viewTarget.observacao}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer border-top border-light-subtle p-3 p-sm-4 d-flex justify-content-end"
              style={{ background: '#FAFBFC', borderRadius: '0 0 16px 16px' }}>
              <button className="btn btn-outline-secondary bg-white fw-semibold text-dark" onClick={() => viewModal.hide()}
                style={{ borderColor: '#E2E8F0', borderRadius: 8, padding: '7px 14px', fontSize: 13 }}>Fechar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Deletar */}
      <div className="modal fade" tabIndex="-1" aria-hidden="true" ref={delModal.ref}>
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-body text-center py-4 px-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: 52, height: 52, background: '#FDECEA', color: '#C0392B', fontSize: 22 }}>
                <i className="bi bi-trash3-fill"></i>
              </div>
              <h6 className="fw-bold mb-2" style={{ fontSize: 15 }}>Excluir Solicitação?</h6>
              <p className="text-secondary mb-3 pb-1" style={{ fontSize: 13 }}>
                Excluir <strong>#{deletingTarget?.id}</strong>? O estoque dos itens será devolvido. Esta ação não pode ser desfeita.
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-outline-secondary bg-white fw-semibold text-dark" onClick={() => delModal.hide()} disabled={deleting}
                  style={{ borderColor: '#E2E8F0', borderRadius: 8, padding: '7px 14px', fontSize: 13 }}>Cancelar</button>
                <button className="btn btn-danger fw-semibold d-inline-flex align-items-center gap-2 border-0 shadow-sm"
                  onClick={confirmDelete} disabled={deleting} style={{ borderRadius: 8, padding: '7px 14px', fontSize: 13 }}>
                  {deleting ? (
                    <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Excluindo…</>
                  ) : (
                    <><i className="bi bi-trash3"></i> Excluir</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
