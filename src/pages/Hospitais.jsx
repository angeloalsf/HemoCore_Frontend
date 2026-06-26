import React, { useState, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import StatCard from '../components/common/StatCard';
import { TableCard, EmptyState, ActionBtn, SearchInput, FilterSelect, Pagination } from '../components/common/TableCard';
import AlertBox from '../components/common/AlertBox';
import FormField, { FormSectionLabel, AutoIdField, baseInputStyle } from '../components/common/FormField';
import { useAlert } from '../hooks/useAlert';
import { useBsModal } from '../hooks/useBsModal';
import { useHospitais } from '../hooks/useHospitais';
import { ApiError } from '../services/apiClient';
import { isValidCNPJ, isValidPhone, formatCNPJ, formatPhone } from '../utils/validation';

// Integração real com a API HemoCore — CRUD de Hospitais (sem mocks).
// Enums reais da API (ver docs/API_HOSPITAIS.md). Rótulos amigáveis só na UI.
const TIPO = {
  PUBLICO: { label: 'Público', cls: 'bg-primary-subtle text-primary-emphasis' },
  PRIVADO: { label: 'Privado', cls: 'bg-body-secondary text-dark' },
  'FILANTRÓPICO': { label: 'Filantrópico', cls: 'bg-success-subtle text-success' },
};
const TIPO_OPTIONS = [
  { value: 'PUBLICO', label: 'Público' },
  { value: 'PRIVADO', label: 'Privado' },
  { value: 'FILANTRÓPICO', label: 'Filantrópico' },
];
const tipoLabel = (t) => TIPO[t]?.label ?? t;
const tipoCls = (t) => TIPO[t]?.cls ?? 'bg-body-secondary text-dark';

const EMPTY_FORM = { nome: '', sigla: '', ufId: '', cidadeId: '', telefone: '', cnpj: '', tipo: 'PUBLICO' };

function validate(form) {
  const e = {};
  if (!form.nome.trim() || form.nome.trim().length < 2) e.nome = 'Nome deve ter pelo menos 2 caracteres.';
  if (!form.sigla.trim()) e.sigla = 'Sigla é obrigatória.';
  if (!form.ufId) e.ufId = 'Selecione o estado.';
  if (!form.cidadeId) e.cidadeId = 'Selecione a cidade.';
  if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório.';
  else if (!isValidPhone(form.telefone)) e.telefone = 'Formato inválido. Use (XX) XXXXX-XXXX.';
  if (!form.cnpj.trim()) e.cnpj = 'CNPJ é obrigatório.';
  else if (!isValidCNPJ(form.cnpj)) e.cnpj = 'CNPJ inválido.';
  if (!form.tipo) e.tipo = 'Selecione o tipo.';
  return e;
}

export default function Hospitais() {
  const {
    hospitais, cidades, ufs,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  } = useHospitais();

  const [editing, setEditing] = useState(null); // hospital em edição (ou null)
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
    return hospitais.filter((h) => {
      const cidadeNome = h.cidade?.nome ?? '';
      const matchSearch =
        h.nome.toLowerCase().includes(q) ||
        (h.sigla || '').toLowerCase().includes(q) ||
        cidadeNome.toLowerCase().includes(q);
      const matchTipo = !filterTipo || h.tipo === filterTipo;
      return matchSearch && matchTipo;
    }).sort((a, b) => a.id - b.id);
  }, [hospitais, search, filterTipo]);

  const openCreate = () => {
    if (busy) return;
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    modal.show();
  };

  const openEdit = (h) => {
    if (busy) return;
    setEditing(h);
    setForm({
      nome: h.nome ?? '',
      sigla: h.sigla ?? '',
      ufId: String(h.cidade?.uf?.id ?? h.cidade?.ufId ?? ''),
      cidadeId: String(h.cidadeId ?? h.cidade?.id ?? ''),
      telefone: h.telefone ?? '',
      cnpj: formatCNPJ(h.cnpj ?? ''),
      tipo: h.tipo ?? 'PUBLICO',
    });
    setFormErrors({});
    modal.show();
  };

  const save = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});

    // Payload limpo para a API
    const payload = {
      ...form,
      cnpj: form.cnpj.replace(/\D/g, ''),
    };

    try {
      if (editing) {
        await atualizar(editing.id, payload);
        showAlert('success', `Hospital <strong>${form.nome}</strong> atualizado!`);
      } else {
        await criar(payload);
        showAlert('success', `Hospital <strong>${form.nome}</strong> cadastrado!`);
      }
      modal.hide();
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao salvar hospital.';
      showAlert('danger', msg);
    }
  };

  const openDelete = (h) => { if (busy) return; setDeletingTarget(h); delModal.show(); };
  const confirmDelete = async () => {
    if (!deletingTarget) return;
    try {
      await remover(deletingTarget.id);
      showAlert('warning', `Hospital <strong>${deletingTarget.nome}</strong> removido.`);
      delModal.hide();
      setDeletingTarget(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao remover hospital.';
      showAlert('danger', msg);
      delModal.hide();
    }
  };

  const pub = hospitais.filter((h) => h.tipo === 'PUBLICO').length;
  const priv = hospitais.filter((h) => h.tipo === 'PRIVADO').length;
  const filan = hospitais.filter((h) => h.tipo === 'FILANTRÓPICO').length;

  return (
    <PageLayout title="Hospitais" subtitle="Gerenciamento de hospitais parceiros"
      action={
        <button className="btn btn-danger text-white fw-semibold d-inline-flex align-items-center gap-2 py-1 px-3 border-0 shadow-sm"
          style={{ fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }} onClick={openCreate} disabled={busy}>
          <i className="bi bi-plus-lg"></i><span className="d-none d-sm-inline">Novo Hospital</span>
        </button>
      }>

      <div className="row row-cols-2 row-cols-lg-4 g-2 g-sm-3 mb-3 mb-sm-4">
        <StatCard icon="bi-hospital-fill" value={hospitais.length.toLocaleString('pt-BR')} label="Total" bgColor="#FDECEA" iconColor="#C0392B" />
        <StatCard icon="bi-building" value={pub} label="Públicos" bgColor="#EBF5FB" iconColor="#2980B9" />
        <StatCard icon="bi-briefcase" value={priv} label="Privados" bgColor="#F4ECF7" iconColor="#8E44AD" />
        <StatCard icon="bi-heart" value={filan} label="Filantrópicos" bgColor="#EAFAF1" iconColor="#27AE60" />
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

      <TableCard title="Lista de Hospitais" count={filtered.length}
        filters={<>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar hospital…" />
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
            <div>Carregando hospitais…</div>
          </div>
        ) : (<>
          <div className="table-responsive d-none d-md-block">
            <table className="table table-borderless table-hover mb-0" style={{ fontSize: 13 }}>
              <thead>
                <tr className="table-header-cell">
                  {['ID', 'Hospital', 'Sigla', 'UF / Cidade', 'Telefone', 'CNPJ', 'Tipo', 'Ações'].map((h, i) => (
                    <th key={h} className={`py-2 px-3 fw-bold text-nowrap${i === 7 ? ' text-end' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan={8} className="p-0 border-0"><EmptyState message="Nenhum hospital encontrado." /></td></tr>
                ) : filtered.map((h) => (
                  <tr key={h.id} className="align-middle">
                    <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">{h.id}</span></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 30, height: 30, background: '#EBF5FB', color: '#2980B9', fontSize: 13 }}>
                          <i className="bi bi-hospital"></i>
                        </div>
                        <strong className="text-dark">{h.nome}</strong>
                      </div>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <code className="fw-bold" style={{ background: '#F4F6F9', padding: '2px 6px', borderRadius: 5, fontSize: 11.5, color: '#718096' }}>{h.sigla}</code>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>
                      {(h.cidade?.uf?.sigla ?? '—')} / {(h.cidade?.nome ?? '—')}
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{h.telefone}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontFamily: 'monospace', fontSize: 11.5 }}>{formatCNPJ(h.cnpj ?? '')}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <span className={`fw-semibold rounded-pill ${tipoCls(h.tipo)}`} style={{ fontSize: 11, padding: '2px 9px' }}>{tipoLabel(h.tipo)}</span>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(h)} title="Editar" />
                        <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(h)} title="Excluir" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-column d-md-none">
            {!filtered.length ? <EmptyState message="Nenhum hospital encontrado." /> :
              filtered.map((h, i) => (
                <div key={h.id} className={`p-3 d-flex align-items-start gap-2${i !== filtered.length - 1 ? ' border-bottom border-light-subtle' : ''}`}>
                  <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 38, height: 38, background: '#EBF5FB', color: '#2980B9', fontSize: 15 }}><i className="bi bi-hospital"></i></div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="id-badge mb-1">{h.id}</div>
                    <div className="fw-bold text-dark" style={{ fontSize: 13.5 }}>{h.nome}</div>
                    <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                      {(h.cidade?.uf?.sigla ?? '—')} · {(h.cidade?.nome ?? '—')} · {h.telefone}
                    </div>
                    <div className="d-flex flex-wrap gap-1 mt-2 align-items-center">
                      <code className="fw-bold" style={{ background: '#F4F6F9', padding: '1px 5px', borderRadius: 4, fontSize: 11, color: '#718096' }}>{h.sigla}</code>
                      <span className={`fw-semibold rounded-pill ${tipoCls(h.tipo)}`} style={{ fontSize: 11, padding: '2px 9px' }}>{tipoLabel(h.tipo)}</span>
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(h)} title="Editar" />
                    <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(h)} title="Excluir" />
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
                <div className="fw-bold text-dark" style={{ fontSize: 15 }}>{editing ? 'Editar Hospital' : 'Novo Hospital'}</div>
                <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                  {editing ? `Editando: ${form.nome}` : 'Preencha os dados do hospital.'}
                </div>
              </div>
              <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={() => setFormErrors({})} disabled={saving}></button>
            </div>
            <div className="modal-body p-3 p-sm-4">
              <FormSectionLabel>Identificação</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-3"><AutoIdField /></div>
                <div className="col-12 col-md-6">
                  <FormField label="Nome" required error={formErrors.nome}>
                    <input type="text" className="form-control focus-ring-danger text-dark" placeholder="Ex: Hospital Santa Casa"
                      value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      style={baseInputStyle(formErrors.nome)} disabled={saving} />
                  </FormField>
                </div>
                <div className="col-6 col-md-3">
                  <FormField label="Sigla" required error={formErrors.sigla}>
                    <input type="text" className="form-control focus-ring-danger text-dark" placeholder="HSC"
                      value={form.sigla} onChange={(e) => setForm((p) => ({ ...p, sigla: e.target.value.toUpperCase() }))}
                      style={baseInputStyle(formErrors.sigla)} maxLength={20} disabled={saving} />
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Localização</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-5 col-md-3">
                  <FormField label="UF" required error={formErrors.ufId}>
                    <select className="form-select focus-ring-danger text-dark" value={form.ufId}
                      onChange={(e) => setForm((p) => ({ ...p, ufId: e.target.value, cidadeId: '' }))}
                      style={baseInputStyle(formErrors.ufId)} disabled={saving}>
                      <option value="">Selecione…</option>
                      {ufs.map((u) => <option key={u.id} value={u.id}>{u.sigla}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="col-7 col-md-9">
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
                  <FormField label="CNPJ" required error={formErrors.cnpj}>
                    <input type="text" className="form-control focus-ring-danger text-dark" placeholder="00.000.000/0000-00"
                      value={form.cnpj} onChange={(e) => setForm((p) => ({ ...p, cnpj: formatCNPJ(e.target.value) }))}
                      style={baseInputStyle(formErrors.cnpj)} maxLength={18} disabled={saving} />
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Classificação</FormSectionLabel>
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <FormField label="Tipo" required error={formErrors.tipo}>
                    <select className="form-select focus-ring-danger text-dark" value={form.tipo}
                      onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
                      style={baseInputStyle(formErrors.tipo)} disabled={saving}>
                      {TIPO_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
      <div className="modal fade" tabIndex="-1" aria-hidden="true" ref={delModal.ref}>
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-body text-center py-4 px-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: 52, height: 52, background: '#FDECEA', color: '#C0392B', fontSize: 22 }}>
                <i className="bi bi-trash3-fill"></i>
              </div>
              <h6 className="fw-bold mb-2" style={{ fontSize: 15 }}>Excluir Hospital?</h6>
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
