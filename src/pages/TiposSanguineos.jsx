import React, { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import StatCard from '../components/common/StatCard';
import { TableCard, EmptyState, ActionBtn, SearchInput, Pagination } from '../components/common/TableCard';
import AlertBox from '../components/common/AlertBox';
import FormField, { FormSectionLabel, AutoIdField, baseInputStyle } from '../components/common/FormField';
import { useAlert } from '../hooks/useAlert';
import { useBsModal } from '../hooks/useBsModal';
import { useTiposSanguineos } from '../hooks/useTiposSanguineos';
import { ApiError } from '../services/apiClient';

const GRUPOS = ['A', 'B', 'AB', 'O'];
const RHS = ['Rh(+)', 'Rh(-)'];
const EMPTY_FORM = { grupo: '', rh: 'Rh(+)', quantidade: 500, desc: '' };

function validate(form) {
  const e = {};
  if (!form.grupo) e.grupo = 'Selecione o grupo ABO.';
  const qty = parseInt(form.quantidade);
  if (isNaN(qty) || qty < 0) e.quantidade = 'Quantidade não pode ser negativa.';
  return e;
}

export default function TiposSanguineos() {
  const { tipos, loading, saving, deleting, busy, loadError, carregar, criar, atualizar, remover } = useTiposSanguineos();

  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');
  const { alert, showAlert } = useAlert();
  const modal = useBsModal();
  const delModal = useBsModal();

  const filtered = tipos.filter((t) =>
    `${t.grupoABO}${t.fatorRH ? '+' : '-'}`.toLowerCase().includes(search.toLowerCase()) ||
    (t.descricao || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.id - b.id);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setFormErrors({}); modal.show(); };
  const openEdit = (id) => {
    const t = tipos.find((x) => x.id === id);
    if (!t) return;
    setEditingId(id);
    setForm({ grupo: t.grupoABO, rh: t.fatorRH ? 'Rh(+)' : 'Rh(-)', quantidade: t.quantidade, desc: t.descricao || '' });
    setFormErrors({});
    modal.show();
  };

  const save = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    const label = `${form.grupo}${form.rh === 'Rh(+)' ? '+' : '-'}`;
    try {
      if (editingId) {
        await atualizar(editingId, form);
        showAlert('success', `Tipo sanguíneo <strong>${label}</strong> atualizado!`);
      } else {
        await criar(form);
        showAlert('success', `Tipo sanguíneo <strong>${label}</strong> cadastrado!`);
      }
      modal.hide();
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        const errMap = {};
        err.details.forEach(d => { if (d.campo) errMap[d.campo] = d.mensagem; });
        setFormErrors(errMap);
      }
      showAlert('danger', err instanceof ApiError ? err.toUserMessage() : 'Erro ao salvar tipo sanguíneo.');
    }
  };

  const openDelete = (id) => { setDeletingId(id); delModal.show(); };
  const confirmDelete = async () => {
    const t = tipos.find((x) => x.id === deletingId);
    const label = t ? `${t.grupoABO}${t.fatorRH ? '+' : '-'}` : '';
    setDeletingId(null);
    delModal.hide();
    try {
      await remover(t.id);
      showAlert('warning', `Tipo <strong>${label}</strong> removido.`);
    } catch (err) {
      showAlert('danger', err instanceof ApiError ? err.toUserMessage() : 'Erro ao excluir tipo sanguíneo.');
    }
  };

  const totalVol = tipos.reduce((s, t) => s + (t.quantidade || 0), 0);
  const delTarget = tipos.find((x) => x.id === deletingId);

  return (
    <PageLayout title="Tipos Sanguíneos" subtitle="Gerenciamento de tipos sanguíneos e estoque"
      action={
        <button className="btn btn-danger text-white fw-semibold d-inline-flex align-items-center gap-2 py-1 px-3 border-0 shadow-sm"
          style={{ fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }} onClick={openCreate} disabled={loading}>
          <i className="bi bi-plus-lg"></i><span className="d-none d-sm-inline">Novo Tipo</span>
        </button>
      }>

      <div className="row row-cols-2 row-cols-lg-4 g-2 g-sm-3 mb-3 mb-sm-4">
        <StatCard icon="bi-droplet-half" value={loading ? '…' : tipos.length} label="Tipos Cadastrados" bgColor="#FDECEA" iconColor="#C0392B" />
        <StatCard icon="bi-moisture" value={loading ? '…' : `${totalVol.toLocaleString('pt-BR')} mL`} label="Volume Total" bgColor="#EBF5FB" iconColor="#2980B9" />
        <StatCard icon="bi-check-circle-fill" value={loading ? '…' : tipos.filter((t) => t.quantidade > 200).length} label="Estoque OK" bgColor="#EAFAF1" iconColor="#27AE60" />
        <StatCard icon="bi-exclamation-triangle-fill" value={loading ? '…' : tipos.filter((t) => t.quantidade <= 200).length} label="Estoque Baixo" bgColor="#FEF9E7" iconColor="#D4AC0D" />
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

      <TableCard title="Lista de Tipos Sanguíneos" count={filtered.length}
        filters={<SearchInput value={search} onChange={setSearch} placeholder="Buscar tipo…" />}
        footer={<Pagination current={1} total={filtered.length} onPrev={() => {}} onNext={() => {}} />}>

        {loading ? (
          <div className="text-center text-secondary py-5" style={{ fontSize: 13.5 }}>
            <div className="spinner-border text-danger mb-2 mx-auto" role="status" style={{ width: 28, height: 28 }}>
              <span className="visually-hidden">Carregando…</span>
            </div>
            <div>Carregando tipos sanguíneos…</div>
          </div>
        ) : (
          <>
            <div className="table-responsive d-none d-md-block">
              <table className="table table-borderless table-hover mb-0" style={{ fontSize: 13 }}>
                <thead>
                  <tr className="table-header-cell">
                    {['ID', 'Tipo', 'Grupo ABO', 'Fator Rh', 'Estoque (mL)', 'Descrição', 'Ações'].map((h, i) => (
                      <th key={h} className={`py-2 px-3 fw-bold text-nowrap${i === 6 ? ' text-end' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!filtered.length ? (
                    <tr><td colSpan={7} className="p-0 border-0"><EmptyState message="Nenhum tipo sanguíneo encontrado." /></td></tr>
                  ) : filtered.map((t) => (
                    <tr key={t.id} className="align-middle">
                      <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">{t.id}</span></td>
                      <td className="py-3 px-3 border-bottom border-light-subtle">
                        <span className="blood-type-badge" style={{ fontSize: 14 }}>{t.grupoABO}{t.fatorRH ? '+' : '-'}</span>
                      </td>
                      <td className="py-3 px-3 border-bottom border-light-subtle"><span className="fw-bold text-dark">{t.grupoABO}</span></td>
                      <td className="py-3 px-3 border-bottom border-light-subtle">
                        <span className={`fw-semibold rounded-pill ${t.fatorRH ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
                          style={{ fontSize: 11, padding: '2px 8px' }}>{t.fatorRH ? 'Rh(+)' : 'Rh(-)'}</span>
                      </td>
                      <td className="py-3 px-3 border-bottom border-light-subtle">
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress" style={{ width: 60, height: 5 }}>
                            <div className="progress-bar bg-danger" style={{ width: `${Math.min(100, Math.round((t.quantidade || 0) / 1000 * 100))}%` }}></div>
                          </div>
                          <span className={`fw-bold ${(t.quantidade || 0) <= 200 ? 'text-warning' : 'text-danger'}`} style={{ fontSize: 12 }}>
                            {(t.quantidade || 0).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 border-bottom border-light-subtle text-secondary" style={{ fontSize: 12, maxWidth: 200 }}>{t.descricao}</td>
                      <td className="py-3 px-3 border-bottom border-light-subtle text-end">
                        <div className="d-flex gap-1 justify-content-end">
                          <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(t.id)} title="Editar" disabled={busy} />
                          <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(t.id)} title="Excluir" disabled={busy} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-flex flex-column d-md-none">
              {!filtered.length ? <EmptyState message="Nenhum tipo sanguíneo encontrado." /> :
                filtered.map((t, i) => (
                  <div key={t.id} className={`p-3 d-flex align-items-start gap-2${i !== filtered.length - 1 ? ' border-bottom border-light-subtle' : ''}`}>
                    <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 38, height: 38, background: '#FDECEA', color: '#C0392B', fontSize: 15 }}>
                      <i className="bi bi-droplet-half"></i>
                    </div>
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="id-badge mb-1">{t.id}</div>
                      <div className="fw-bold text-dark" style={{ fontSize: 16 }}>{t.grupoABO}{t.fatorRH ? '+' : '-'}</div>
                      <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>{t.descricao}</div>
                      <div className="mt-2">
                        <span className={`fw-bold ${(t.quantidade || 0) <= 200 ? 'text-warning' : 'text-danger'}`} style={{ fontSize: 12 }}>
                          Estoque: {(t.quantidade || 0).toLocaleString('pt-BR')} mL
                        </span>
                      </div>
                    </div>
                    <div className="d-flex gap-1 flex-shrink-0">
                      <ActionBtn icon="bi-pencil" color="#718096" onClick={() => openEdit(t.id)} title="Editar" disabled={busy} />
                      <ActionBtn icon="bi-trash3" color="#C0392B" onClick={() => openDelete(t.id)} title="Excluir" disabled={busy} />
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}
      </TableCard>

      {/* Modal Criar/Editar */}
      <div className="modal fade" tabIndex="-1" aria-hidden="true" ref={modal.ref}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: 500 }}>
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-header border-bottom border-light-subtle p-3 p-sm-4">
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: 15 }}>{editingId ? 'Editar Tipo Sanguíneo' : 'Novo Tipo Sanguíneo'}</div>
                <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>Cadastre um grupo ABO e fator Rh.</div>
              </div>
              <button type="button" className="btn-close" onClick={() => { modal.hide(); setFormErrors({}); }} disabled={saving}></button>
            </div>
            <div className="modal-body p-3 p-sm-4">
              <FormSectionLabel>Identificação</FormSectionLabel>
              <div className="row g-3 mb-4"><div className="col-12"><AutoIdField /></div></div>

              <FormSectionLabel>Classificação</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-6">
                  <FormField label="Grupo ABO" required error={formErrors.grupo}>
                    <select className="form-select focus-ring-danger text-dark" value={form.grupo}
                      onChange={(e) => setForm((p) => ({ ...p, grupo: e.target.value }))}
                      style={baseInputStyle(formErrors.grupo)} disabled={saving}>
                      <option value="">Selecione…</option>
                      {GRUPOS.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="col-6">
                  <FormField label="Fator Rh" required>
                    <select className="form-select focus-ring-danger text-dark" value={form.rh}
                      onChange={(e) => setForm((p) => ({ ...p, rh: e.target.value }))}
                      style={baseInputStyle()} disabled={saving}>
                      {RHS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Estoque</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-12">
                  <FormField label="Quantidade em estoque (mL)" required error={formErrors.quantidade}>
                    <input type="number" className="form-control focus-ring-danger text-dark" value={form.quantidade}
                      min={0} step={50} onChange={(e) => setForm((p) => ({ ...p, quantidade: e.target.value }))}
                      style={baseInputStyle(formErrors.quantidade)} disabled={saving} />
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Informações Adicionais</FormSectionLabel>
              <div className="row g-3">
                <div className="col-12">
                  <FormField label="Descrição">
                    <textarea className="form-control focus-ring-danger text-dark" value={form.desc}
                      onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
                      placeholder="Observações ou notas sobre este tipo sanguíneo…"
                      style={{ borderColor: '#E2E8F0', borderRadius: 8, fontSize: 13.5, padding: '8px 12px', resize: 'vertical', minHeight: 80 }}
                      disabled={saving} />
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
                {saving
                  ? <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando…</>
                  : <><i className="bi bi-floppy"></i> {editingId ? 'Atualizar' : 'Salvar'}</>
                }
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
              <h6 className="fw-bold mb-2" style={{ fontSize: 15 }}>Excluir Tipo Sanguíneo?</h6>
              <p className="text-secondary mb-3 pb-1" style={{ fontSize: 13 }}>
                Excluir <strong>{delTarget?.grupoABO}{delTarget?.fatorRH ? '+' : '-'}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-outline-secondary bg-white fw-semibold text-dark" onClick={() => delModal.hide()} disabled={deleting}
                  style={{ borderColor: '#E2E8F0', borderRadius: 8, padding: '7px 14px', fontSize: 13 }}>Cancelar</button>
                <button className="btn btn-danger fw-semibold d-inline-flex align-items-center gap-2 border-0 shadow-sm"
                  onClick={confirmDelete} disabled={deleting} style={{ borderRadius: 8, padding: '7px 14px', fontSize: 13 }}>
                  {deleting
                    ? <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Excluindo…</>
                    : <><i className="bi bi-trash3"></i> Excluir</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
