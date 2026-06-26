import React, { useState, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import StatCard from '../components/common/StatCard';
import { TableCard, EmptyState, ActionBtn, SearchInput, FilterSelect, Pagination } from '../components/common/TableCard';
import AlertBox from '../components/common/AlertBox';
import FormField, { FormSectionLabel, AutoIdField, baseInputStyle } from '../components/common/FormField';
import { useAlert } from '../hooks/useAlert';
import { useBsModal } from '../hooks/useBsModal';
import { useUnidadesColeta } from '../hooks/useUnidadesColeta';
import { ApiError } from '../services/apiClient';
import { isValidPhone, formatPhone } from '../utils/validation';

// Integração real com a API HemoCore — CRUD de Unidades de Coleta (sem mocks, sem dados locais).
// Enums reais da API (ver docs/API_UNIDADES_COLETA.md). Rótulos amigáveis só na UI.
const TIPO = {
  FIXA: { label: 'Fixa', cls: 'bg-success-subtle text-success', icon: 'bi-pin-map-fill' },
  'MÓVEL': { label: 'Móvel', cls: 'bg-warning-subtle text-warning-emphasis', icon: 'bi-truck' },
};
const TIPO_OPTIONS = [
  { value: 'FIXA', label: 'Fixa' },
  { value: 'MÓVEL', label: 'Móvel' },
];
const tipoLabel = (t) => TIPO[t]?.label ?? t;
const tipoCls = (t) => TIPO[t]?.cls ?? 'bg-body-secondary text-dark';
const tipoIcon = (t) => TIPO[t]?.icon ?? 'bi-building';

const EMPTY_FORM = { nome: '', tipo_unidade: 'FIXA', ufId: '', cidadeId: '', telefone: '' };

function validate(form) {
  const e = {};
  if (!form.nome.trim() || form.nome.trim().length < 2) e.nome = 'Nome deve ter entre 2 e 50 caracteres.';
  else if (form.nome.trim().length > 50) e.nome = 'Nome deve ter no máximo 50 caracteres.';
  if (!form.tipo_unidade) e.tipo_unidade = 'Selecione o tipo.';
  if (!form.ufId) e.ufId = 'Selecione o estado.';
  if (!form.cidadeId) e.cidadeId = 'Selecione a cidade.';
  if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório.';
  else if (!isValidPhone(form.telefone)) e.telefone = 'Formato inválido. Use (XX) XXXXX-XXXX.';
  return e;
}

export default function UnidadesColeta() {
  const {
    unidades, cidades, ufs,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  } = useUnidadesColeta();

  const [editing, setEditing] = useState(null); // unidade em edição (ou null)
  const [deletingTarget, setDeletingTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
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
    return unidades.filter((u) => {
      const cidadeNome = u.cidade?.nome ?? '';
      const matchSearch =
        u.nome.toLowerCase().includes(q) ||
        cidadeNome.toLowerCase().includes(q);
      const matchTipo = !filterTipo || u.tipo_unidade === filterTipo;
      return matchSearch && matchTipo;
    }).sort((a, b) => a.id - b.id);
  }, [unidades, search, filterTipo]);

  const openCreate = () => {
    if (busy) return;
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    modal.show();
  };

  const openEdit = (u) => {
    if (busy) return;
    setEditing(u);
    setForm({
      nome: u.nome ?? '',
      tipo_unidade: u.tipo_unidade ?? 'FIXA',
      ufId: String(u.cidade?.uf?.id ?? u.cidade?.ufId ?? ''),
      cidadeId: String(u.cidadeId ?? u.cidade?.id ?? ''),
      telefone: u.telefone ?? '',
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
        showAlert('success', `Unidade <strong>${form.nome}</strong> atualizada!`);
      } else {
        await criar(form);
        showAlert('success', `Unidade <strong>${form.nome}</strong> cadastrada!`);
      }
      modal.hide();
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao salvar unidade de coleta.';
      showAlert('danger', msg);
    }
  };

  const openDelete = (u) => { if (busy) return; setDeletingTarget(u); delModal.show(); };
  const confirmDelete = async () => {
    if (!deletingTarget) return;
    try {
      await remover(deletingTarget.id);
      showAlert('warning', `Unidade <strong>${deletingTarget.nome}</strong> removida.`);
      delModal.hide();
      setDeletingTarget(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao remover unidade de coleta.';
      showAlert('danger', msg);
      delModal.hide();
    }
  };

  const fixas = unidades.filter((u) => u.tipo_unidade === 'FIXA').length;
  const moveis = unidades.filter((u) => u.tipo_unidade === 'MÓVEL').length;
  const estados = [...new Set(unidades.map((u) => u.cidade?.uf?.sigla).filter(Boolean))].length;

  return (
    <PageLayout title="Unidades de Coleta" subtitle="Gerenciamento de pontos de coleta de sangue"
      action={
        <button className="btn btn-danger text-white fw-semibold d-inline-flex align-items-center gap-2 py-1 px-3 border-0 shadow-sm"
          style={{ fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }} onClick={openCreate} disabled={busy}>
          <i className="bi bi-plus-lg"></i><span className="d-none d-sm-inline">Nova Unidade</span>
        </button>
      }>

      <div className="row row-cols-2 row-cols-lg-4 g-2 g-sm-3 mb-3 mb-sm-4">
        <StatCard icon="bi-building-add" value={unidades.length.toLocaleString('pt-BR')} label="Total" bgColor="#FDECEA" iconColor="#C0392B" />
        <StatCard icon="bi-pin-map-fill" value={fixas} label="Fixas" bgColor="#EAFAF1" iconColor="#27AE60" />
        <StatCard icon="bi-truck" value={moveis} label="Móveis" bgColor="#FEF9E7" iconColor="#D4AC0D" />
        <StatCard icon="bi-geo-alt-fill" value={estados} label="Estados" bgColor="#EBF5FB" iconColor="#2980B9" />
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

      <TableCard title="Lista de Unidades de Coleta" count={filtered.length}
        filters={<>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar unidade…" />
          <FilterSelect value={filterTipo} onChange={setFilterTipo} options={[
            { value: '', label: 'Todos os tipos' },
            ...TIPO_OPTIONS,
          ]} />
        </>}
        footer={<Pagination current={1} total={filtered.length} onPrev={() => {}} onNext={() => {}} />}>

        {loading ? (
          <div className="text-center text-secondary py-5 px-3" style={{ fontSize: 13.5 }}>
            <div className="spinner-border text-danger mb-2" role="status" style={{ width: 28, height: 28 }}>
              <span className="visually-hidden">Carregando…</span>
            </div>
            <div>Carregando unidades de coleta…</div>
          </div>
        ) : (<>
          <div className="table-responsive d-none d-md-block">
            <table className="table table-borderless table-hover mb-0" style={{ fontSize: 13 }}>
              <thead>
                <tr className="table-header-cell">
                  {['ID', 'Unidade', 'Tipo', 'UF / Cidade', 'Telefone', 'Ações'].map((h, i) => (
                    <th key={h} className={`py-2 px-3 fw-bold text-nowrap${i === 5 ? ' text-end' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan={6} className="p-0 border-0"><EmptyState message="Nenhuma unidade encontrada." /></td></tr>
                ) : filtered.map((u) => (
                  <tr key={u.id} className="align-middle">
                    <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">{u.id}</span></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 30, height: 30, background: '#FDECEA', color: '#C0392B', fontSize: 13 }}>
                          <i className={`bi ${tipoIcon(u.tipo_unidade)}`}></i>
                        </div>
                        <strong className="text-dark">{u.nome}</strong>
                      </div>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <span className={`fw-semibold rounded-pill ${tipoCls(u.tipo_unidade)}`} style={{ fontSize: 11, padding: '2px 9px' }}>{tipoLabel(u.tipo_unidade)}</span>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>
                      {(u.cidade?.uf?.sigla ?? '—')} / {(u.cidade?.nome ?? '—')}
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{u.telefone || '—'}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(u)} title="Editar" />
                        <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(u)} title="Excluir" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-column d-md-none">
            {!filtered.length ? <EmptyState message="Nenhuma unidade encontrada." /> :
              filtered.map((u, i) => (
                <div key={u.id} className={`p-3 d-flex align-items-start gap-2${i !== filtered.length - 1 ? ' border-bottom border-light-subtle' : ''}`}>
                  <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 38, height: 38, background: '#FDECEA', color: '#C0392B', fontSize: 15 }}>
                    <i className={`bi ${tipoIcon(u.tipo_unidade)}`}></i>
                  </div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="id-badge mb-1">{u.id}</div>
                    <div className="fw-bold text-dark" style={{ fontSize: 13.5 }}>{u.nome}</div>
                    <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                      {(u.cidade?.uf?.sigla ?? '—')} · {(u.cidade?.nome ?? '—')} {u.telefone ? `· ${u.telefone}` : ''}
                    </div>
                    <div className="mt-2">
                      <span className={`fw-semibold rounded-pill ${tipoCls(u.tipo_unidade)}`} style={{ fontSize: 11, padding: '2px 9px' }}>{tipoLabel(u.tipo_unidade)}</span>
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(u)} title="Editar" />
                    <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(u)} title="Excluir" />
                  </div>
                </div>
              ))
            }
          </div>
        </>)}
      </TableCard>

      {/* Modal Criar/Editar */}
      <div className="modal fade" tabIndex="-1" aria-hidden="true" ref={modal.ref}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: 520 }}>
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-header border-bottom border-light-subtle p-3 p-sm-4">
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: 15 }}>{editing ? 'Editar Unidade' : 'Nova Unidade de Coleta'}</div>
                <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                  {editing ? `Editando: ${form.nome}` : 'Cadastre um ponto fixo ou móvel de coleta.'}
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => { modal.hide(); setFormErrors({}); }} disabled={saving}></button>
            </div>
            <div className="modal-body p-3 p-sm-4">
              <FormSectionLabel>Identificação</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-4"><AutoIdField /></div>
                <div className="col-12 col-md-8">
                  <FormField label="Nome" required error={formErrors.nome}>
                    <input type="text" className="form-control focus-ring-danger text-dark" placeholder="Ex: Hemocentro Central de Vitória"
                      value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      style={baseInputStyle(formErrors.nome)} maxLength={50} disabled={saving} />
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Tipo</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-12">
                  <FormField label="Tipo de Unidade" required error={formErrors.tipo_unidade}>
                    <select className="form-select focus-ring-danger text-dark" value={form.tipo_unidade}
                      onChange={(e) => setForm((p) => ({ ...p, tipo_unidade: e.target.value }))}
                      style={baseInputStyle(formErrors.tipo_unidade)} disabled={saving}>
                      {TIPO_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Localização</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-5 col-sm-4">
                  <FormField label="UF" required error={formErrors.ufId}>
                    <select className="form-select focus-ring-danger text-dark" value={form.ufId}
                      onChange={(e) => setForm((p) => ({ ...p, ufId: e.target.value, cidadeId: '' }))}
                      style={baseInputStyle(formErrors.ufId)} disabled={saving}>
                      <option value="">Selecione…</option>
                      {ufs.map((u) => <option key={u.id} value={u.id}>{u.sigla}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="col-7 col-sm-8">
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

              <FormSectionLabel>Contato</FormSectionLabel>
              <div className="row g-3">
                <div className="col-12">
                  <FormField label="Telefone" required error={formErrors.telefone}>
                    <input type="tel" className="form-control focus-ring-danger text-dark" placeholder="(28) 3322-0000"
                      value={form.telefone} onChange={(e) => setForm((p) => ({ ...p, telefone: formatPhone(e.target.value) }))}
                      style={baseInputStyle(formErrors.telefone)} maxLength={15} disabled={saving} />
                  </FormField>
                </div>
              </div>
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

      {/* Modal Deletar */}
      <div className="modal fade" tabIndex="-1" aria-hidden="true" ref={delModal.ref}>
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-body text-center py-4 px-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: 52, height: 52, background: '#FDECEA', color: '#C0392B', fontSize: 22 }}>
                <i className="bi bi-trash3-fill"></i>
              </div>
              <h6 className="fw-bold mb-2" style={{ fontSize: 15 }}>Excluir Unidade?</h6>
              <p className="text-secondary mb-3 pb-1" style={{ fontSize: 13 }}>
                Excluir <strong>{deletingTarget?.nome}</strong>? Esta ação não pode ser desfeita.
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
