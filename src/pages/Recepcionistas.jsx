import React, { useState, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import StatCard from '../components/common/StatCard';
import { TableCard, EmptyState, ActionBtn, SearchInput, FilterSelect, Pagination } from '../components/common/TableCard';
import AlertBox from '../components/common/AlertBox';
import FormField, { FormSectionLabel, AutoIdField, baseInputStyle } from '../components/common/FormField';
import { useAlert } from '../hooks/useAlert';
import { useBsModal } from '../hooks/useBsModal';
import { useRecepcionistas } from '../hooks/useRecepcionistas';
import { ApiError } from '../services/apiClient';
import { isValidCPF, isValidPhone, formatCPF, formatPhone, getInitials } from '../utils/validation';

// Integração real com a API HemoCore — CRUD de Recepcionistas (sem mocks).
// Contrato em docs/API_RECEPCIONISTAS.md.
const EMPTY_FORM = { nome: '', ufId: '', cidadeId: '', telefone: '', cpf: '', login: '', senha: '' };

// Validações alinhadas ao modelo Sequelize do backend:
// nome 2–50, telefone (NN) NNNNN-NNNN, cpf NNN.NNN.NNN-NN, login 4–20, senha mín. 6.
function validate(form) {
  const e = {};
  if (!form.nome.trim() || form.nome.trim().length < 2) e.nome = 'Nome deve ter entre 2 e 50 caracteres.';
  else if (form.nome.trim().length > 50) e.nome = 'Nome deve ter no máximo 50 caracteres.';
  if (!form.ufId) e.ufId = 'Selecione o estado.';
  if (!form.cidadeId) e.cidadeId = 'Selecione a cidade.';
  if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório.';
  else if (!isValidPhone(form.telefone)) e.telefone = 'Formato inválido. Use (XX) XXXXX-XXXX.';
  if (!form.cpf.trim()) e.cpf = 'CPF é obrigatório.';
  else if (!isValidCPF(form.cpf)) e.cpf = 'CPF inválido.';
  if (!form.login.trim()) e.login = 'Login é obrigatório.';
  else if (form.login.trim().length < 4 || form.login.trim().length > 20) e.login = 'Login deve ter entre 4 e 20 caracteres.';
  if (!form.senha) e.senha = 'Senha é obrigatória.';
  else if (form.senha.length < 6) e.senha = 'Senha deve ter pelo menos 6 caracteres.';
  return e;
}

export default function Recepcionistas() {
  const {
    recepcionistas, cidades, ufs,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  } = useRecepcionistas();

  const [editing, setEditing] = useState(null); // recepcionista em edição (ou null)
  const [deletingTarget, setDeletingTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [search, setSearch] = useState('');
  const [filterUf, setFilterUf] = useState('');
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
    return recepcionistas.filter((r) => {
      const cidadeNome = r.cidade?.nome ?? '';
      const ufSigla = r.cidade?.uf?.sigla ?? '';
      const matchSearch =
        r.nome.toLowerCase().includes(q) ||
        (r.login || '').toLowerCase().includes(q) ||
        (r.cpf || '').includes(search) ||
        cidadeNome.toLowerCase().includes(q);
      const matchUf = !filterUf || ufSigla === filterUf;
      return matchSearch && matchUf;
    });
  }, [recepcionistas, search, filterUf]);

  const openCreate = () => {
    if (busy) return;
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowPw(false);
    modal.show();
  };

  const openEdit = (r) => {
    if (busy) return;
    setEditing(r);
    setForm({
      nome: r.nome ?? '',
      ufId: String(r.cidade?.uf?.id ?? r.cidade?.ufId ?? ''),
      cidadeId: String(r.cidadeId ?? r.cidade?.id ?? ''),
      telefone: r.telefone ?? '',
      cpf: r.cpf ?? '',
      login: r.login ?? '',
      // O backend sobrescreve a senha em todo PUT; pré-preenchemos a atual
      // (retornada pela API) para não apagá-la ao editar.
      senha: r.senha ?? '',
    });
    setFormErrors({});
    setShowPw(false);
    modal.show();
  };

  const save = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    try {
      if (editing) {
        await atualizar(editing.id, form);
        showAlert('success', `Recepcionista <strong>${form.nome}</strong> atualizada!`);
      } else {
        await criar(form);
        showAlert('success', `Recepcionista <strong>${form.nome}</strong> cadastrada!`);
      }
      modal.hide();
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao salvar recepcionista.';
      showAlert('danger', msg);
    }
  };

  const openDelete = (r) => { if (busy) return; setDeletingTarget(r); delModal.show(); };
  const confirmDelete = async () => {
    if (!deletingTarget) return;
    try {
      await remover(deletingTarget.id);
      showAlert('warning', `Recepcionista <strong>${deletingTarget.nome}</strong> removida.`);
      delModal.hide();
      setDeletingTarget(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao remover recepcionista.';
      showAlert('danger', msg);
      delModal.hide();
    }
  };

  const estados = new Set(recepcionistas.map((r) => r.cidade?.uf?.sigla).filter(Boolean)).size;
  const ufOptions = useMemo(
    () => [...new Set(recepcionistas.map((r) => r.cidade?.uf?.sigla).filter(Boolean))]
      .sort()
      .map((s) => ({ value: s, label: s })),
    [recepcionistas],
  );

  return (
    <PageLayout title="Recepcionistas" subtitle="Gerenciamento de recepcionistas do sistema"
      action={
        <button className="btn btn-danger text-white fw-semibold d-inline-flex align-items-center gap-2 py-1 px-3 border-0 shadow-sm"
          style={{ fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }} onClick={openCreate} disabled={busy}>
          <i className="bi bi-plus-lg"></i><span className="d-none d-sm-inline">Nova Recepcionista</span>
        </button>
      }>

      <div className="row row-cols-2 row-cols-lg-4 g-2 g-sm-3 mb-3 mb-sm-4">
        <StatCard icon="bi-person-badge-fill" value={recepcionistas.length.toLocaleString('pt-BR')} label="Total" bgColor="#FDECEA" iconColor="#C0392B" />
        <StatCard icon="bi-check-circle-fill" value={recepcionistas.length.toLocaleString('pt-BR')} label="Ativos" bgColor="#EAFAF1" iconColor="#27AE60" />
        <StatCard icon="bi-geo-alt-fill" value={estados} label="Estados" bgColor="#EBF5FB" iconColor="#2980B9" />
        <StatCard icon="bi-shield-lock" value={recepcionistas.length.toLocaleString('pt-BR')} label="Acessos" bgColor="#F4ECF7" iconColor="#8E44AD" />
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

      <TableCard title="Lista de Recepcionistas" count={filtered.length}
        filters={<>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar recepcionista…" />
          <FilterSelect value={filterUf} onChange={setFilterUf} options={[
            { value: '', label: 'Todos os estados' },
            ...ufOptions,
          ]} />
        </>}
        footer={<Pagination current={1} total={filtered.length} onPrev={() => {}} onNext={() => {}} />}>

        {loading ? (
          <div className="text-center text-secondary py-5 px-3" style={{ fontSize: 13.5 }}>
            <div className="spinner-border text-danger mb-2" role="status" style={{ width: 28, height: 28 }}>
              <span className="visually-hidden">Carregando…</span>
            </div>
            <div>Carregando recepcionistas…</div>
          </div>
        ) : (<>
          <div className="table-responsive d-none d-md-block">
            <table className="table table-borderless table-hover mb-0" style={{ fontSize: 13 }}>
              <thead>
                <tr className="table-header-cell">
                  {['ID', 'Nome', 'UF / Cidade', 'Telefone', 'CPF', 'Login', 'Ações'].map((h, i) => (
                    <th key={h} className={`py-2 px-3 fw-bold text-nowrap${i === 6 ? ' text-end' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan={7} className="p-0 border-0"><EmptyState message="Nenhuma recepcionista encontrada." /></td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id} className="align-middle">
                    <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">{r.id}</span></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <div className="d-flex align-items-center gap-2">
                        <div className="avatar-circle fw-bold flex-shrink-0" style={{ background: '#FDECEA', color: '#C0392B' }}>{getInitials(r.nome)}</div>
                        <strong className="text-dark">{r.nome}</strong>
                      </div>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>
                      {(r.cidade?.uf?.sigla ?? '—')} / {(r.cidade?.nome ?? '—')}
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{r.telefone}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.cpf}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <span className="fw-semibold rounded" style={{ fontSize: 11, padding: '2px 8px', background: '#F4ECF7', color: '#6C3483', fontFamily: 'monospace' }}>{r.login}</span>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(r)} title="Editar" />
                        <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(r)} title="Excluir" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-column d-md-none">
            {!filtered.length ? <EmptyState message="Nenhuma recepcionista encontrada." /> :
              filtered.map((r, i) => (
                <div key={r.id} className={`p-3 d-flex align-items-start gap-2${i !== filtered.length - 1 ? ' border-bottom border-light-subtle' : ''}`}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                    style={{ width: 38, height: 38, background: '#FDECEA', color: '#C0392B', fontSize: 13 }}>{getInitials(r.nome)}</div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="id-badge mb-1">{r.id}</div>
                    <div className="fw-bold text-dark" style={{ fontSize: 13.5 }}>{r.nome}</div>
                    <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                      {(r.cidade?.uf?.sigla ?? '—')} · {(r.cidade?.nome ?? '—')} · {r.telefone}
                    </div>
                    <div className="mt-2">
                      <span className="fw-semibold rounded" style={{ fontSize: 11, padding: '2px 8px', background: '#F4ECF7', color: '#6C3483', fontFamily: 'monospace' }}>{r.login}</span>
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(r)} title="Editar" />
                    <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(r)} title="Excluir" />
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
                <div className="fw-bold text-dark" style={{ fontSize: 15 }}>{editing ? 'Editar Recepcionista' : 'Nova Recepcionista'}</div>
                <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                  {editing ? `Editando: ${form.nome}` : 'Preencha os campos para cadastrar uma recepcionista.'}
                </div>
              </div>
              <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={() => setFormErrors({})} disabled={saving}></button>
            </div>
            <div className="modal-body p-3 p-sm-4">
              <FormSectionLabel>Identificação</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-4"><AutoIdField /></div>
                <div className="col-12 col-md-8">
                  <FormField label="Nome completo" required error={formErrors.nome}>
                    <input type="text" className="form-control focus-ring-danger text-dark" placeholder="Ex: Juliana Rodrigues"
                      value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      style={baseInputStyle(formErrors.nome)} maxLength={50} disabled={saving} />
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Localização</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-5 col-md-4">
                  <FormField label="UF" required error={formErrors.ufId}>
                    <select className="form-select focus-ring-danger text-dark" value={form.ufId}
                      onChange={(e) => setForm((p) => ({ ...p, ufId: e.target.value, cidadeId: '' }))}
                      style={baseInputStyle(formErrors.ufId)} disabled={saving}>
                      <option value="">Selecione…</option>
                      {ufs.map((u) => <option key={u.id} value={u.id}>{u.sigla}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="col-7 col-md-8">
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

              <FormSectionLabel>Acesso ao Sistema</FormSectionLabel>
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <FormField label="Login" required error={formErrors.login}>
                    <input type="text" className="form-control focus-ring-danger text-dark" placeholder="Ex: juliana.rodrigues"
                      value={form.login} onChange={(e) => setForm((p) => ({ ...p, login: e.target.value.toLowerCase() }))}
                      style={baseInputStyle(formErrors.login)} maxLength={20} disabled={saving} />
                  </FormField>
                </div>
                <div className="col-12 col-sm-6">
                  <FormField label="Senha" required error={formErrors.senha} hint="Mínimo 6 caracteres.">
                    <div className="position-relative">
                      <input type={showPw ? 'text' : 'password'} className="form-control focus-ring-danger text-dark"
                        placeholder="Mínimo 6 caracteres"
                        value={form.senha} onChange={(e) => setForm((p) => ({ ...p, senha: e.target.value }))}
                        style={{ ...baseInputStyle(formErrors.senha), paddingRight: 40 }} disabled={saving} />
                      <button type="button" className="btn btn-link position-absolute text-secondary p-0 text-decoration-none d-flex align-items-center"
                        onClick={() => setShowPw((p) => !p)} style={{ right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>
                        <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
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
      <div className="modal fade" tabIndex="-1" aria-hidden="true" ref={delModal.ref}>
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-body text-center py-4 px-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: 52, height: 52, background: '#FDECEA', color: '#C0392B', fontSize: 22 }}>
                <i className="bi bi-trash3-fill"></i>
              </div>
              <h6 className="fw-bold mb-2" style={{ fontSize: 15 }}>Excluir Recepcionista?</h6>
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
