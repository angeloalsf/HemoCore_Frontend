import React, { useState, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import StatCard from '../components/common/StatCard';
import { TableCard, EmptyState, ActionBtn, SearchInput, FilterSelect, Pagination } from '../components/common/TableCard';
import AlertBox from '../components/common/AlertBox';
import FormField, { FormSectionLabel, AutoIdField, baseInputStyle } from '../components/common/FormField';
import { useAlert } from '../hooks/useAlert';
import { useBsModal } from '../hooks/useBsModal';
import { useDoadores } from '../hooks/useDoadores';
import { tipoSanguineoLabel } from '../services/lookupService';
import { ApiError } from '../services/apiClient';
import { isValidCPF, isValidPhone, formatCPF, formatPhone, getInitials } from '../utils/validation';

// Integração real com a API HemoCore — CRUD de Doadores (sem mocks).
// Enums reais da API (ver docs/API_DOADORES.md). Rótulos amigáveis só na UI.
const STATUS = {
  APTO: { label: 'Apto para Doação', cls: 'bg-success bg-opacity-10 text-success' },
  PENDENTE: { label: 'Pendente para Doação', cls: 'bg-warning bg-opacity-10 text-warning-emphasis' },
  INAPTO: { label: 'Inapto para Doação', cls: 'bg-danger bg-opacity-10 text-danger' },
};
const statusLabel = (s) => STATUS[s]?.label ?? s;
const statusCls = (s) => STATUS[s]?.cls ?? '';

// Backend aceita apenas M / F.
const SEXO_OPTIONS = [{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }];
const sexoLabel = (v) => SEXO_OPTIONS.find((s) => s.value === v)?.label ?? v;

const EMPTY_FORM = { nome: '', sexo: '', ufId: '', cidadeId: '', telefone: '', cpf: '', status: 'PENDENTE', tipoSanguineoId: '' };

function validate(form) {
  const e = {};
  if (!form.nome.trim() || form.nome.trim().length < 2) e.nome = 'Nome deve ter pelo menos 2 caracteres.';
  if (!form.sexo) e.sexo = 'Selecione o sexo.';
  if (!form.ufId) e.ufId = 'Selecione o estado.';
  if (!form.cidadeId) e.cidadeId = 'Selecione a cidade.';
  if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório.';
  else if (!isValidPhone(form.telefone)) e.telefone = 'Formato inválido. Use (XX) XXXXX-XXXX.';
  if (!form.cpf.trim()) e.cpf = 'CPF é obrigatório.';
  else if (!isValidCPF(form.cpf)) e.cpf = 'CPF inválido.';
  if (!form.tipoSanguineoId) e.tipoSanguineoId = 'Selecione o tipo sanguíneo.';
  return e;
}

export default function Doadores() {
  const {
    doadores, tiposSanguineos, cidades, ufs,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  } = useDoadores();

  const [editing, setEditing] = useState(null); // doador em edição (ou null)
  const [deletingTarget, setDeletingTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { alert, showAlert } = useAlert();
  const modal = useBsModal();
  const delModal = useBsModal();

  // Cidades disponíveis para a UF selecionada (filtro no cliente).
  const cidadesDaUf = useMemo(() => {
    if (!form.ufId) return [];
    return cidades.filter((c) => String(c.uf?.id ?? c.ufId) === String(form.ufId));
  }, [cidades, form.ufId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return doadores.filter((d) => {
      const cidadeNome = d.cidade?.nome ?? '';
      const matchSearch =
        d.nome.toLowerCase().includes(q) ||
        (d.cpf || '').includes(search) ||
        cidadeNome.toLowerCase().includes(q);
      const matchStatus = !filterStatus || d.status === filterStatus;
      return matchSearch && matchStatus;
    }).sort((a, b) => a.id - b.id);
  }, [doadores, search, filterStatus]);

  const openCreate = () => {
    if (busy) return;
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    modal.show();
  };

  const openEdit = (d) => {
    if (busy) return;
    setEditing(d);
    setForm({
      nome: d.nome ?? '',
      sexo: d.sexo ?? '',
      ufId: String(d.cidade?.uf?.id ?? d.cidade?.ufId ?? ''),
      cidadeId: String(d.cidadeId ?? d.cidade?.id ?? ''),
      telefone: d.telefone ?? '',
      cpf: d.cpf ?? '',
      status: d.status ?? 'PENDENTE',
      tipoSanguineoId: String(d.tipoSanguineoId ?? d.tipoSanguineo?.id ?? ''),
    });
    setFormErrors({});
    modal.show();
  };

  const save = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    try {
      if (editing) {
        await atualizar(editing.id, form);
        showAlert('success', `Doador <strong>${form.nome}</strong> atualizado!`);
      } else {
        await criar(form);
        showAlert('success', `Doador <strong>${form.nome}</strong> cadastrado!`);
      }
      modal.hide();
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao salvar doador.';
      showAlert('danger', msg);
    }
  };

  const openDelete = (d) => { if (busy) return; setDeletingTarget(d); delModal.show(); };
  const confirmDelete = async () => {
    if (!deletingTarget) return;
    try {
      await remover(deletingTarget.id);
      showAlert('warning', `Doador <strong>${deletingTarget.nome}</strong> removido.`);
      delModal.hide();
      setDeletingTarget(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao remover doador.';
      showAlert('danger', msg);
      delModal.hide();
    }
  };

  const aptos = doadores.filter((d) => d.status === 'APTO').length;
  const pendentes = doadores.filter((d) => d.status === 'PENDENTE').length;
  const inaptos = doadores.filter((d) => d.status === 'INAPTO').length;

  return (
    <PageLayout title="Doadores" subtitle="Gerenciamento de doadores cadastrados"
      action={
        <button className="btn btn-danger text-white fw-semibold d-inline-flex align-items-center gap-2 py-1 px-3 border-0 shadow-sm"
          style={{ fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }} onClick={openCreate} disabled={busy}>
          <i className="bi bi-plus-lg"></i><span className="d-none d-sm-inline">Novo Doador</span>
        </button>
      }>

      <div className="row row-cols-2 row-cols-lg-4 g-2 g-sm-3 mb-3 mb-sm-4">
        <StatCard icon="bi-people-fill" value={doadores.length.toLocaleString('pt-BR')} label="Total de Doadores" bgColor="#FDECEA" iconColor="#C0392B" />
        <StatCard icon="bi-check-circle-fill" value={aptos} label="Aptos para Doação" bgColor="#EAFAF1" iconColor="#27AE60" />
        <StatCard icon="bi-clock-fill" value={pendentes} label="Pendentes para Doação" bgColor="#FEF9E7" iconColor="#D4AC0D" />
        <StatCard icon="bi-x-circle-fill" value={inaptos} label="Inaptos para Doação" bgColor="#EBF5FB" iconColor="#2980B9" />
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

      <TableCard title="Lista de Doadores" count={filtered.length}
        filters={<>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar doador…" />
          <FilterSelect value={filterStatus} onChange={setFilterStatus} options={[
            { value: '', label: 'Todos os status' },
            { value: 'APTO', label: 'Apto para Doação' },
            { value: 'PENDENTE', label: 'Pendente para Doação' },
            { value: 'INAPTO', label: 'Inapto para Doação' },
          ]} />
        </>}
        footer={<Pagination current={1} total={filtered.length} onPrev={() => {}} onNext={() => {}} />}>

        {loading ? (
          <div className="text-center text-secondary py-5 px-3" style={{ fontSize: 13.5 }}>
            <div className="spinner-border text-danger mb-2" role="status" style={{ width: 28, height: 28 }}>
              <span className="visually-hidden">Carregando…</span>
            </div>
            <div>Carregando doadores…</div>
          </div>
        ) : (<>
          <div className="table-responsive d-none d-md-block">
            <table className="table table-borderless table-hover mb-0" style={{ fontSize: 13 }}>
              <thead>
                <tr className="table-header-cell">
                  {['ID', 'Doador', 'Sexo', 'UF / Cidade', 'Telefone', 'CPF', 'Tipo', 'Status', 'Ações'].map((h, i) => (
                    <th key={h} className={`py-2 px-3 fw-bold text-nowrap${i === 8 ? ' text-end' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan={9} className="p-0 border-0"><EmptyState message="Nenhum doador encontrado." /></td></tr>
                ) : filtered.map((d) => (
                  <tr key={d.id} className="align-middle">
                    <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">{d.id}</span></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <div className="d-flex align-items-center gap-2">
                        <div className="avatar-circle fw-bold flex-shrink-0" style={{ background: '#FDECEA', color: '#C0392B' }}>{getInitials(d.nome)}</div>
                        <strong className="text-dark" style={{ fontSize: 13.5 }}>{d.nome}</strong>
                      </div>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{sexoLabel(d.sexo)}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>
                      {(d.cidade?.uf?.sigla ?? '—')} / {(d.cidade?.nome ?? '—')}
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{d.telefone}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.cpf}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle"><span className="blood-type-badge">{tipoSanguineoLabel(d.tipoSanguineo)}</span></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <span className={`rounded-pill fw-semibold ${statusCls(d.status)}`} style={{ fontSize: 11, padding: '2px 8px' }}>{statusLabel(d.status)}</span>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(d)} title="Editar" />
                        <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(d)} title="Excluir" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-column d-md-none">
            {!filtered.length ? <EmptyState message="Nenhum doador encontrado." /> :
              filtered.map((d, i) => (
                <div key={d.id} className={`p-3 d-flex align-items-start gap-2${i !== filtered.length - 1 ? ' border-bottom border-light-subtle' : ''}`}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                    style={{ width: 38, height: 38, background: '#FDECEA', color: '#C0392B', fontSize: 13 }}>{getInitials(d.nome)}</div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="id-badge mb-1">{d.id}</div>
                    <div className="fw-bold text-dark" style={{ fontSize: 13.5 }}>{d.nome}</div>
                    <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                      {(d.cidade?.uf?.sigla ?? '—')} · {(d.cidade?.nome ?? '—')} · {d.telefone}
                    </div>
                    <div className="d-flex flex-wrap gap-1 mt-2">
                      <span className="blood-type-badge">{tipoSanguineoLabel(d.tipoSanguineo)}</span>
                      <span className={`rounded-pill fw-semibold ${statusCls(d.status)}`} style={{ fontSize: 11, padding: '2px 8px' }}>{statusLabel(d.status)}</span>
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(d)} title="Editar" />
                    <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(d)} title="Excluir" />
                  </div>
                </div>
              ))
            }
          </div>
        </>)}
      </TableCard>

      {/* Modal Criar/Editar */}
      <div className="modal fade" id="modalDoador" tabIndex="-1" aria-hidden="true" ref={modal.ref}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-header border-bottom border-light-subtle p-3 p-sm-4">
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: 15 }}>{editing ? 'Editar Doador' : 'Novo Doador'}</div>
                <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                  {editing ? `Editando: ${form.nome}` : 'Preencha os campos para cadastrar um novo doador.'}
                </div>
              </div>
              <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={() => setFormErrors({})} disabled={saving}></button>
            </div>
            <div className="modal-body p-3 p-sm-4">
              <FormSectionLabel>Identificação</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-4"><AutoIdField /></div>
                <div className="col-12 col-md-4">
                  <FormField label="Nome completo" required error={formErrors.nome}>
                    <input type="text" className="form-control focus-ring-danger text-dark" placeholder="Ex: Maria Oliveira"
                      value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      style={baseInputStyle(formErrors.nome)} disabled={saving} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField label="Sexo" required error={formErrors.sexo}>
                    <select className="form-select focus-ring-danger text-dark" value={form.sexo}
                      onChange={(e) => setForm((p) => ({ ...p, sexo: e.target.value }))}
                      style={baseInputStyle(formErrors.sexo)} disabled={saving}>
                      <option value="">Selecione…</option>
                      {SEXO_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Localização</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-6 col-md-4">
                  <FormField label="UF" required error={formErrors.ufId}>
                    <select className="form-select focus-ring-danger text-dark" value={form.ufId}
                      onChange={(e) => setForm((p) => ({ ...p, ufId: e.target.value, cidadeId: '' }))}
                      style={baseInputStyle(formErrors.ufId)} disabled={saving}>
                      <option value="">Selecione…</option>
                      {ufs.map((u) => <option key={u.id} value={u.id}>{u.sigla}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="col-6 col-md-8">
                  <FormField label="Cidade" required error={formErrors.cidadeId}>
                    <select className="form-select focus-ring-danger text-dark" value={form.cidadeId}
                      onChange={(e) => setForm((p) => ({ ...p, cidadeId: e.target.value }))}
                      style={baseInputStyle(formErrors.cidadeId)} disabled={saving || !form.ufId}>
                      <option value="">{form.ufId ? 'Selecione a cidade…' : 'Selecione a UF primeiro…'}</option>
                      {cidadesDaUf.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Contato &amp; Documentos</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6">
                  <FormField label="Telefone" required error={formErrors.telefone}>
                    <input type="tel" className="form-control focus-ring-danger text-dark" placeholder="(28) 99999-0000"
                      value={form.telefone} onChange={(e) => setForm((p) => ({ ...p, telefone: formatPhone(e.target.value) }))}
                      style={baseInputStyle(formErrors.telefone)} maxLength={15} disabled={saving} />
                  </FormField>
                </div>
                <div className="col-12 col-sm-6">
                  <FormField label="CPF" required error={formErrors.cpf}>
                    <input type="text" className="form-control focus-ring-danger text-dark" placeholder="000.000.000-00"
                      value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: formatCPF(e.target.value) }))}
                      style={baseInputStyle(formErrors.cpf)} maxLength={14} disabled={saving} />
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Informações Médicas</FormSectionLabel>
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <FormField label="Status" required>
                    <select className="form-select focus-ring-danger text-dark" value={form.status}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} style={baseInputStyle()} disabled={saving}>
                      <option value="APTO">Apto para Doação</option>
                      <option value="PENDENTE">Pendente para Doação</option>
                      <option value="INAPTO">Inapto para Doação</option>
                    </select>
                  </FormField>
                </div>
                <div className="col-12 col-sm-6">
                  <FormField label="Tipo Sanguíneo" required error={formErrors.tipoSanguineoId}>
                    <select className="form-select focus-ring-danger text-dark" value={form.tipoSanguineoId}
                      onChange={(e) => setForm((p) => ({ ...p, tipoSanguineoId: e.target.value }))}
                      style={baseInputStyle(formErrors.tipoSanguineoId)} disabled={saving}>
                      <option value="">Selecione…</option>
                      {tiposSanguineos.map((t) => <option key={t.id} value={t.id}>{tipoSanguineoLabel(t)}</option>)}
                    </select>
                  </FormField>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top border-light-subtle p-3 p-sm-4 d-flex justify-content-end gap-2"
              style={{ background: '#FAFBFC', borderRadius: '0 0 16px 16px' }}>
              <button className="btn btn-outline-secondary bg-white fw-semibold text-dark" data-bs-dismiss="modal"
                onClick={() => setFormErrors({})} disabled={saving}
                style={{ borderColor: '#E2E8F0', borderRadius: 8, padding: '7px 14px', fontSize: 13 }}>Cancelar</button>
              <button className="btn btn-danger fw-semibold d-inline-flex align-items-center gap-2 border-0 shadow-sm"
                onClick={save} disabled={saving} style={{ borderRadius: 8, padding: '7px 14px', fontSize: 13 }}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm" role="status"></span> Salvando…</>
                  : <><i className="bi bi-floppy"></i> {editing ? 'Atualizar' : 'Salvar'}</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Deletar */}
      <div className="modal fade" id="modalDeleteDoador" tabIndex="-1" aria-hidden="true" ref={delModal.ref}>
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-body text-center py-4 px-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: 52, height: 52, background: '#FDECEA', color: '#C0392B', fontSize: 22 }}>
                <i className="bi bi-trash3-fill"></i>
              </div>
              <h6 className="fw-bold mb-2" style={{ fontSize: 15 }}>Excluir Doador?</h6>
              <p className="text-secondary mb-3 pb-1" style={{ fontSize: 13 }}>
                Excluir <strong>{deletingTarget?.nome}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-outline-secondary bg-white fw-semibold text-dark" onClick={() => delModal.hide()} disabled={deleting}
                  style={{ borderColor: '#E2E8F0', borderRadius: 8, padding: '7px 14px', fontSize: 13 }}>Cancelar</button>
                <button className="btn btn-danger fw-semibold d-inline-flex align-items-center gap-2 border-0 shadow-sm"
                  onClick={confirmDelete} disabled={deleting} style={{ borderRadius: 8, padding: '7px 14px', fontSize: 13 }}>
                  {deleting
                    ? <><span className="spinner-border spinner-border-sm" role="status"></span> Excluindo…</>
                    : <><i className="bi bi-trash3"></i> Excluir</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
