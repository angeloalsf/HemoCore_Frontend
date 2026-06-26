import React, { useState, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import StatCard from '../components/common/StatCard';
import { TableCard, EmptyState, ActionBtn, SearchInput, FilterSelect, Pagination } from '../components/common/TableCard';
import AlertBox from '../components/common/AlertBox';
import FormField, { FormSectionLabel, AutoIdField, baseInputStyle } from '../components/common/FormField';
import { useAlert } from '../hooks/useAlert';
import { useBsModal } from '../hooks/useBsModal';
import { useCidades } from '../hooks/useCidades';
import { ApiError } from '../services/apiClient';

// Integração real com a API HemoCore — CRUD de Cidades (sem mocks, sem dados locais).
// Contrato em docs/API_CIDADES.md. Validações espelham models/Cidade.js do backend.

const EMPTY_FORM = { ufId: '', nome: '', habitantes: '', area: '' };

function validate(form) {
  const e = {};
  if (!form.ufId) e.ufId = 'Selecione o estado.';
  const nome = form.nome.trim();
  if (!nome || nome.length < 2) e.nome = 'Nome deve ter entre 2 e 50 caracteres.';
  else if (nome.length > 50) e.nome = 'Nome deve ter no máximo 50 caracteres.';
  const hab = Number.parseInt(form.habitantes, 10);
  if (form.habitantes === '' || Number.isNaN(hab) || hab < 0) e.habitantes = 'Informe os habitantes (inteiro ≥ 0).';
  const area = Number.parseFloat(form.area);
  if (form.area === '' || Number.isNaN(area) || area < 0) e.area = 'Informe a área em km² (número ≥ 0).';
  return e;
}

export default function Cidades() {
  const {
    cidades, ufs,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  } = useCidades();

  const [editing, setEditing] = useState(null); // cidade em edição (ou null)
  const [deletingTarget, setDeletingTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');
  const [filterUF, setFilterUF] = useState('');
  const { alert, showAlert } = useAlert();
  const modal = useBsModal();
  const delModal = useBsModal();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cidades.filter((c) => {
      const sigla = c.uf?.sigla ?? '';
      const matchSearch =
        (c.nome ?? '').toLowerCase().includes(q) ||
        sigla.toLowerCase().includes(q);
      const matchUF = !filterUF || String(c.uf?.id) === String(filterUF);
      return matchSearch && matchUF;
    }).sort((a, b) => a.id - b.id);
  }, [cidades, search, filterUF]);

  const openCreate = () => {
    if (busy) return;
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    modal.show();
  };

  const openEdit = (c) => {
    if (busy) return;
    setEditing(c);
    setForm({
      ufId: String(c.uf?.id ?? c.ufId ?? ''),
      nome: c.nome ?? '',
      habitantes: c.habitantes != null ? String(c.habitantes) : '',
      area: c.area != null ? String(c.area) : '',
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
        showAlert('success', `Cidade <strong>${form.nome}</strong> atualizada!`);
      } else {
        await criar(form);
        showAlert('success', `Cidade <strong>${form.nome}</strong> cadastrada!`);
      }
      modal.hide();
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao salvar cidade.';
      showAlert('danger', msg);
    }
  };

  const openDelete = (c) => { if (busy) return; setDeletingTarget(c); delModal.show(); };
  const confirmDelete = async () => {
    if (!deletingTarget) return;
    try {
      await remover(deletingTarget.id);
      showAlert('warning', `Cidade <strong>${deletingTarget.nome}</strong> removida.`);
      delModal.hide();
      setDeletingTarget(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao remover cidade.';
      showAlert('danger', msg);
      delModal.hide();
    }
  };

  const estados = [...new Set(cidades.map((c) => c.uf?.sigla).filter(Boolean))].length;
  const totalHab = cidades.reduce((s, c) => s + (Number(c.habitantes) || 0), 0);
  const totalArea = cidades.reduce((s, c) => s + (Number(c.area) || 0), 0);

  return (
    <PageLayout title="Cidades" subtitle="Gerenciamento de municípios cadastrados"
      action={
        <button className="btn btn-danger text-white fw-semibold d-inline-flex align-items-center gap-2 py-1 px-3 border-0 shadow-sm"
          style={{ fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }} onClick={openCreate} disabled={busy}>
          <i className="bi bi-plus-lg"></i><span className="d-none d-sm-inline">Nova Cidade</span>
        </button>
      }>

      <div className="row row-cols-2 row-cols-lg-4 g-2 g-sm-3 mb-3 mb-sm-4">
        <StatCard icon="bi-geo-alt-fill" value={cidades.length.toLocaleString('pt-BR')} label="Total de Cidades" bgColor="#FDECEA" iconColor="#C0392B" />
        <StatCard icon="bi-map-fill" value={estados} label="Estados" bgColor="#EBF5FB" iconColor="#2980B9" />
        <StatCard icon="bi-people-fill" value={(totalHab / 1000000).toFixed(1) + 'M'} label="Habitantes" bgColor="#EAFAF1" iconColor="#27AE60" />
        <StatCard icon="bi-aspect-ratio-fill" value={totalArea.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' km²'} label="Área Total" bgColor="#FEF9E7" iconColor="#D4AC0D" />
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

      <TableCard title="Lista de Cidades" count={filtered.length}
        filters={<>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar cidade…" />
          <FilterSelect value={filterUF} onChange={setFilterUF} options={[
            { value: '', label: 'Todos os estados' },
            ...ufs.map((u) => ({ value: String(u.id), label: u.sigla })),
          ]} />
        </>}
        footer={<Pagination current={1} total={filtered.length} onPrev={() => {}} onNext={() => {}} />}>

        {loading ? (
          <div className="text-center text-secondary py-5 px-3" style={{ fontSize: 13.5 }}>
            <div className="spinner-border text-danger mb-2" role="status" style={{ width: 28, height: 28 }}>
              <span className="visually-hidden">Carregando…</span>
            </div>
            <div>Carregando cidades…</div>
          </div>
        ) : (<>
          <div className="table-responsive d-none d-md-block">
            <table className="table table-borderless table-hover mb-0" style={{ fontSize: 13 }}>
              <thead>
                <tr className="table-header-cell">
                  {['ID', 'Cidade', 'UF', 'Habitantes', 'Área (km²)', 'Ações'].map((h, i) => (
                    <th key={h} className={`py-2 px-3 fw-bold text-nowrap${i === 5 ? ' text-end' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan={6} className="p-0 border-0"><EmptyState message="Nenhuma cidade encontrada." /></td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="align-middle">
                    <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">{c.id}</span></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle"><strong className="text-dark">{c.nome}</strong></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <span className="fw-bold rounded px-2" style={{ fontSize: 11, background: '#EBF5FB', color: '#2980B9', padding: '2px 8px' }}>{c.uf?.sigla ?? '—'}</span>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{Number(c.habitantes).toLocaleString('pt-BR')}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{Number(c.area).toLocaleString('pt-BR')}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(c)} title="Editar" />
                        <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(c)} title="Excluir" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-column d-md-none">
            {!filtered.length ? <EmptyState message="Nenhuma cidade encontrada." /> :
              filtered.map((c, i) => (
                <div key={c.id} className={`p-3 d-flex align-items-start gap-2${i !== filtered.length - 1 ? ' border-bottom border-light-subtle' : ''}`}>
                  <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 38, height: 38, background: '#EBF5FB', color: '#2980B9', fontSize: 15 }}><i className="bi bi-geo-alt-fill"></i></div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="id-badge mb-1">{c.id}</div>
                    <div className="fw-bold text-dark" style={{ fontSize: 13.5 }}>{c.nome}</div>
                    <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                      {(c.uf?.sigla ?? '—')} · {Number(c.habitantes).toLocaleString('pt-BR')} hab. · {Number(c.area).toLocaleString('pt-BR')} km²
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(c)} title="Editar" />
                    <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(c)} title="Excluir" />
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
                <div className="fw-bold text-dark" style={{ fontSize: 15 }}>{editing ? 'Editar Cidade' : 'Nova Cidade'}</div>
                <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                  {editing ? `Editando: ${form.nome}` : 'Cadastre um município no sistema.'}
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => { modal.hide(); setFormErrors({}); }} disabled={saving}></button>
            </div>
            <div className="modal-body p-3 p-sm-4">
              <FormSectionLabel>Identificação</FormSectionLabel>
              <div className="row g-3 mb-4"><div className="col-12"><AutoIdField /></div></div>

              <FormSectionLabel>Localização</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-5 col-sm-4">
                  <FormField label="UF" required error={formErrors.ufId}>
                    <select className="form-select focus-ring-danger text-dark" value={form.ufId}
                      onChange={(e) => setForm((p) => ({ ...p, ufId: e.target.value }))}
                      style={baseInputStyle(formErrors.ufId)} disabled={saving}>
                      <option value="">Selecione…</option>
                      {ufs.map((u) => <option key={u.id} value={u.id}>{u.sigla}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="col-7 col-sm-8">
                  <FormField label="Nome" required error={formErrors.nome}>
                    <input type="text" className="form-control focus-ring-danger text-dark" placeholder="Ex: Cachoeiro de Itapemirim"
                      value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      style={baseInputStyle(formErrors.nome)} maxLength={50} disabled={saving} />
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Dados Demográficos</FormSectionLabel>
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <FormField label="Habitantes" required error={formErrors.habitantes} hint="Número total de habitantes">
                    <input type="number" className="form-control focus-ring-danger text-dark" placeholder="Ex: 230000"
                      value={form.habitantes} min={0} step={1} onChange={(e) => setForm((p) => ({ ...p, habitantes: e.target.value }))}
                      style={baseInputStyle(formErrors.habitantes)} disabled={saving} />
                  </FormField>
                </div>
                <div className="col-12 col-sm-6">
                  <FormField label="Área (km²)" required error={formErrors.area} hint="Área territorial em km²">
                    <input type="number" className="form-control focus-ring-danger text-dark" placeholder="Ex: 891.50"
                      value={form.area} min={0} step={0.01} onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                      style={baseInputStyle(formErrors.area)} disabled={saving} />
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
              <h6 className="fw-bold mb-2" style={{ fontSize: 15 }}>Excluir Cidade?</h6>
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
