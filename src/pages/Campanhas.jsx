import React, { useState, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import StatCard from '../components/common/StatCard';
import { TableCard, EmptyState, ActionBtn, SearchInput, Pagination } from '../components/common/TableCard';
import AlertBox from '../components/common/AlertBox';
import FormField, { FormSectionLabel, AutoIdField, baseInputStyle } from '../components/common/FormField';
import { useAlert } from '../hooks/useAlert';
import { useBsModal } from '../hooks/useBsModal';
import { useCampanhas } from '../hooks/useCampanhas';
import { tipoSanguineoLabel } from '../services/lookupService';
import { ApiError } from '../services/apiClient';
import { formatDate, today } from '../utils/validation';

// Integração real com a API HemoCore — CRUD de Campanhas (sem mocks, sem dados locais).
// Contrato em docs/API_CAMPANHAS.md. Os campos seguem exatamente o backend:
//   campanha: { nome, data, unidadeColeta:{id}, itensCampanha:[{ metaColeta, quantiaColetada, tipoSanguineo:{id} }] }

const EMPTY_ITEM = { tipoSanguineoId: '', metaColeta: 1000, quantiaColetada: 0 };
const novoForm = () => ({ nome: '', data: today(), unidadeColetaId: '', itens: [{ ...EMPTY_ITEM }] });

const itensDe = (c) => (Array.isArray(c.itensCampanha) ? c.itensCampanha : []);
const totalMeta = (c) => itensDe(c).reduce((s, it) => s + (Number(it.metaColeta) || 0), 0);
const totalCol = (c) => itensDe(c).reduce((s, it) => s + (Number(it.quantiaColetada) || 0), 0);
const pct = (c) => { const tm = totalMeta(c); return tm ? Math.min(100, Math.round((totalCol(c) / tm) * 100)) : 0; };
const cidadeDe = (c) => c.unidadeColeta?.cidade?.nome ?? '—';
const unidadeNome = (c) => c.unidadeColeta?.nome ?? '—';

function validate(form) {
  const e = {};
  const nome = form.nome.trim();
  if (!nome || nome.length < 2) e.nome = 'Nome deve ter entre 2 e 50 caracteres.';
  else if (nome.length > 50) e.nome = 'Nome deve ter no máximo 50 caracteres.';
  if (!form.data) e.data = 'Data é obrigatória.';
  if (!form.unidadeColetaId) e.unidadeColetaId = 'Selecione a unidade de coleta.';
  if (!form.itens.length) e.itens = 'Adicione pelo menos um tipo sanguíneo.';
  form.itens.forEach((it, i) => {
    if (!it.tipoSanguineoId) e[`tipoSanguineoId_${i}`] = 'Selecione o tipo sanguíneo.';
    const meta = Number(it.metaColeta);
    if (!Number.isInteger(meta) || meta < 1) e[`metaColeta_${i}`] = 'Meta deve ser um inteiro maior que zero.';
    const col = Number(it.quantiaColetada);
    if (!Number.isInteger(col) || col < 0) e[`quantiaColetada_${i}`] = 'Quantidade coletada não pode ser negativa.';
  });
  return e;
}

export default function Campanhas() {
  const {
    campanhas, unidades, tiposSanguineos,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  } = useCampanhas();

  const [editing, setEditing] = useState(null); // campanha em edição (ou null)
  const [deletingTarget, setDeletingTarget] = useState(null);
  const [form, setForm] = useState(novoForm());
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');
  const { alert, showAlert } = useAlert();
  const modal = useBsModal();
  const delModal = useBsModal();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return campanhas.filter((c) =>
      (c.nome ?? '').toLowerCase().includes(q) ||
      unidadeNome(c).toLowerCase().includes(q) ||
      cidadeDe(c).toLowerCase().includes(q)
    );
  }, [campanhas, search]);

  const addItem = () => setForm((p) => ({ ...p, itens: [...p.itens, { ...EMPTY_ITEM }] }));
  const removeItem = (i) => setForm((p) => ({ ...p, itens: p.itens.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, value) =>
    setForm((p) => ({ ...p, itens: p.itens.map((it, idx) => idx === i ? { ...it, [field]: value } : it) }));

  const openCreate = () => {
    if (busy) return;
    setEditing(null);
    setForm(novoForm());
    setFormErrors({});
    modal.show();
  };

  const openEdit = (c) => {
    if (busy) return;
    setEditing(c);
    setForm({
      nome: c.nome ?? '',
      data: c.data ?? today(),
      unidadeColetaId: String(c.unidadeColetaId ?? c.unidadeColeta?.id ?? ''),
      itens: itensDe(c).map((it) => ({
        tipoSanguineoId: String(it.tipoSanguineoId ?? it.tipoSanguineo?.id ?? ''),
        metaColeta: it.metaColeta ?? 0,
        quantiaColetada: it.quantiaColetada ?? 0,
      })),
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
        showAlert('success', `Campanha <strong>${form.nome}</strong> atualizada!`);
      } else {
        await criar(form);
        showAlert('success', `Campanha <strong>${form.nome}</strong> cadastrada!`);
      }
      modal.hide();
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao salvar campanha.';
      showAlert('danger', msg);
    }
  };

  const openDelete = (c) => { if (busy) return; setDeletingTarget(c); delModal.show(); };
  const confirmDelete = async () => {
    if (!deletingTarget) return;
    try {
      await remover(deletingTarget.id);
      showAlert('warning', `Campanha <strong>${deletingTarget.nome}</strong> removida.`);
      delModal.hide();
      setDeletingTarget(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao remover campanha.';
      showAlert('danger', msg);
      delModal.hide();
    }
  };

  const ativas = campanhas.filter((c) => c.data && new Date(c.data) >= new Date(today())).length;
  const concluidas = campanhas.filter((c) => totalMeta(c) > 0 && totalCol(c) >= totalMeta(c)).length;
  const volTotal = campanhas.reduce((s, c) => s + totalCol(c), 0);

  return (
    <PageLayout title="Campanhas" subtitle="Gerenciamento de campanhas de coleta de sangue"
      action={
        <button className="btn btn-danger text-white fw-semibold d-inline-flex align-items-center gap-2 py-1 px-3 border-0 shadow-sm"
          style={{ fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }} onClick={openCreate} disabled={busy}>
          <i className="bi bi-plus-lg"></i><span className="d-none d-sm-inline">Nova Campanha</span>
        </button>
      }>

      <div className="row row-cols-2 row-cols-lg-4 g-2 g-sm-3 mb-3 mb-sm-4">
        <StatCard icon="bi-megaphone-fill" value={campanhas.length.toLocaleString('pt-BR')} label="Total" bgColor="#FDECEA" iconColor="#C0392B" />
        <StatCard icon="bi-calendar-check" value={ativas} label="Ativas/Futuras" bgColor="#EAFAF1" iconColor="#27AE60" />
        <StatCard icon="bi-trophy-fill" value={concluidas} label="Meta Atingida" bgColor="#FEF9E7" iconColor="#D4AC0D" />
        <StatCard icon="bi-droplet-half" value={volTotal.toLocaleString('pt-BR') + ' mL'} label="Vol. Coletado" bgColor="#EBF5FB" iconColor="#2980B9" />
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

      <TableCard title="Lista de Campanhas" count={filtered.length}
        filters={<SearchInput value={search} onChange={setSearch} placeholder="Buscar campanha…" />}
        footer={<Pagination current={1} total={filtered.length} onPrev={() => {}} onNext={() => {}} />}>

        {loading ? (
          <div className="text-center text-secondary py-5 px-3" style={{ fontSize: 13.5 }}>
            <div className="spinner-border text-danger mb-2" role="status" style={{ width: 28, height: 28 }}>
              <span className="visually-hidden">Carregando…</span>
            </div>
            <div>Carregando campanhas…</div>
          </div>
        ) : (<>
          <div className="table-responsive d-none d-md-block">
            <table className="table table-borderless table-hover mb-0" style={{ fontSize: 13 }}>
              <thead>
                <tr className="table-header-cell">
                  {['ID', 'Campanha', 'Data', 'Unidade / Cidade', 'Tipos', 'Progresso', 'Ações'].map((h, i) => (
                    <th key={h} className={`py-2 px-3 fw-bold text-nowrap${i === 6 ? ' text-end' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan={7} className="p-0 border-0"><EmptyState message="Nenhuma campanha encontrada." /></td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="align-middle">
                    <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">{c.id}</span></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle"><strong className="text-dark">{c.nome}</strong></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{formatDate(c.data)}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>
                      {unidadeNome(c)}<br /><span className="text-secondary" style={{ fontSize: 11 }}>{cidadeDe(c)}</span>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <div className="d-flex flex-wrap gap-1">
                        {itensDe(c).map((it) => (
                          <span key={it.id} className="blood-type-badge">{tipoSanguineoLabel(it.tipoSanguineo)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle" style={{ minWidth: 140 }}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: 5 }}>
                          <div className="progress-bar bg-danger" style={{ width: `${pct(c)}%` }}></div>
                        </div>
                        <span className="text-secondary fw-bold" style={{ fontSize: 11, minWidth: 32 }}>{pct(c)}%</span>
                      </div>
                      <div className="text-secondary mt-1" style={{ fontSize: 10.5 }}>
                        {totalCol(c).toLocaleString('pt-BR')} / {totalMeta(c).toLocaleString('pt-BR')} mL
                      </div>
                    </td>
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
            {!filtered.length ? <EmptyState message="Nenhuma campanha encontrada." /> :
              filtered.map((c, i) => (
                <div key={c.id} className={`p-3 d-flex align-items-start gap-2${i !== filtered.length - 1 ? ' border-bottom border-light-subtle' : ''}`}>
                  <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 38, height: 38, background: '#FDECEA', color: '#C0392B', fontSize: 15 }}>
                    <i className="bi bi-megaphone-fill"></i>
                  </div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="id-badge mb-1">{c.id}</div>
                    <div className="fw-bold text-dark" style={{ fontSize: 13.5 }}>{c.nome}</div>
                    <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>{formatDate(c.data)} · {cidadeDe(c)}</div>
                    <div className="d-flex flex-wrap gap-1 mt-2 align-items-center">
                      {itensDe(c).map((it) => <span key={it.id} className="blood-type-badge">{tipoSanguineoLabel(it.tipoSanguineo)}</span>)}
                      <span className="text-secondary fw-semibold" style={{ fontSize: 11 }}>{pct(c)}%</span>
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
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-header border-bottom border-light-subtle p-3 p-sm-4">
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: 15 }}>{editing ? 'Editar Campanha' : 'Nova Campanha'}</div>
                <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                  {editing ? `Editando: ${form.nome}` : 'Cadastre uma campanha de coleta de sangue.'}
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => { modal.hide(); setFormErrors({}); }} disabled={saving}></button>
            </div>
            <div className="modal-body p-3 p-sm-4">
              <FormSectionLabel>Identificação</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-3"><AutoIdField /></div>
                <div className="col-12 col-md-5">
                  <FormField label="Nome" required error={formErrors.nome}>
                    <input type="text" className="form-control focus-ring-danger text-dark" placeholder="Ex: Campanha Julho Vermelho"
                      value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      style={baseInputStyle(formErrors.nome)} maxLength={50} disabled={saving} />
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

              <FormSectionLabel>Unidade de Coleta</FormSectionLabel>
              <div className="row g-3 mb-4">
                <div className="col-12">
                  <FormField label="Unidade de Coleta" required error={formErrors.unidadeColetaId}>
                    <select className="form-select focus-ring-danger text-dark" value={form.unidadeColetaId}
                      onChange={(e) => setForm((p) => ({ ...p, unidadeColetaId: e.target.value }))}
                      style={baseInputStyle(formErrors.unidadeColetaId)} disabled={saving}>
                      <option value="">Selecione…</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}{u.cidade?.nome ? ` — ${u.cidade.nome}${u.cidade?.uf?.sigla ? `/${u.cidade.uf.sigla}` : ''}` : ''}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>

              <FormSectionLabel>Sangue &amp; Metas</FormSectionLabel>

              {form.itens.map((it, i) => (
                <div key={i} className="border border-light-subtle rounded-3 p-3 mb-2" style={{ background: '#FAFBFC' }}>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="fw-semibold text-secondary" style={{ fontSize: 11.5 }}>Item #{i + 1}</span>
                    <button type="button"
                      className="btn btn-light btn-sm d-inline-flex align-items-center gap-1"
                      style={{ fontSize: 12, borderRadius: 7, color: '#C0392B', borderColor: '#E2E8F0' }}
                      onClick={() => removeItem(i)}
                      disabled={form.itens.length === 1 || saving}
                      title="Remover item">
                      <i className="bi bi-trash3" style={{ fontSize: 12 }}></i> Remover
                    </button>
                  </div>
                  <div className="row g-3">
                    <div className={`col-12 ${editing ? 'col-sm-4' : 'col-sm-5'}`}>
                      <FormField label="Tipo Sanguíneo" required error={formErrors[`tipoSanguineoId_${i}`]}>
                        <select className="form-select focus-ring-danger text-dark" value={it.tipoSanguineoId}
                          onChange={(e) => updateItem(i, 'tipoSanguineoId', e.target.value)}
                          style={baseInputStyle(formErrors[`tipoSanguineoId_${i}`])} disabled={saving}>
                          <option value="">Selecione…</option>
                          {tiposSanguineos.map((t) => (
                            <option key={t.id} value={t.id}>{tipoSanguineoLabel(t)}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                    <div className={`col-12 ${editing ? 'col-sm-4' : 'col-sm-7'}`}>
                      <FormField label="Meta de Coleta (mL)" required error={formErrors[`metaColeta_${i}`]}>
                        <input type="number" className="form-control focus-ring-danger text-dark" value={it.metaColeta}
                          min={1} step={100} onChange={(e) => updateItem(i, 'metaColeta', e.target.value)}
                          style={baseInputStyle(formErrors[`metaColeta_${i}`])} disabled={saving} />
                      </FormField>
                    </div>
                    {editing && (
                      <div className="col-12 col-sm-4">
                        <FormField label="Qtd. Coletada (mL)" error={formErrors[`quantiaColetada_${i}`]}>
                          <input type="number" className="form-control focus-ring-danger text-dark" value={it.quantiaColetada}
                            min={0} step={50} onChange={(e) => updateItem(i, 'quantiaColetada', e.target.value)}
                            style={baseInputStyle(formErrors[`quantiaColetada_${i}`])} disabled={saving} />
                        </FormField>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {formErrors.itens && (
                <div className="text-danger mb-2" style={{ fontSize: 11.5 }}>{formErrors.itens}</div>
              )}

              <button type="button"
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2 mt-1"
                style={{ fontSize: 12, borderRadius: 8, padding: '6px 12px' }}
                onClick={addItem} disabled={saving}>
                <i className="bi bi-plus-lg"></i> Adicionar tipo sanguíneo
              </button>

              {!editing && (
                <div className="text-secondary mt-2" style={{ fontSize: 11 }}>
                  <i className="bi bi-info-circle me-1"></i>
                  A quantidade coletada é registrada como 0 no agendamento e poderá ser editada posteriormente.
                </div>
              )}
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
              <h6 className="fw-bold mb-2" style={{ fontSize: 15 }}>Excluir Campanha?</h6>
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
