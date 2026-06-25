import React, { useState, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import StatCard from '../components/common/StatCard';
import { TableCard, EmptyState, ActionBtn, SearchInput, Pagination, DateInput } from '../components/common/TableCard';
import AlertBox from '../components/common/AlertBox';
import FormField, { FormSectionLabel, AutoIdField, baseInputStyle } from '../components/common/FormField';
import { useAlert } from '../hooks/useAlert';
import { useBsModal } from '../hooks/useBsModal';
import { useDoacoes } from '../hooks/useDoacoes';
import { tipoSanguineoLabel } from '../services/lookupService';
import { ApiError } from '../services/apiClient';
import { formatDate, today } from '../utils/validation';

// Integração real com a API HemoCore — CRUD de Doações (sem mocks).
// Contrato em docs/API_DOACOES.md. Campos da API: data (YYYY-MM-DD),
// quantia (450|500), doador:{id}, enfermeiro:{id}, unidadeColeta:{id}.
const EMPTY_FORM = { doadorId: '', enfermeiroId: '', unidadeColetaId: '', data: today(), quantia: 500 };

function validate(form) {
  const e = {};
  if (!form.doadorId) e.doadorId = 'Selecione o doador.';
  if (!form.enfermeiroId) e.enfermeiroId = 'Selecione o enfermeiro.';
  if (!form.unidadeColetaId) e.unidadeColetaId = 'Selecione a unidade de coleta.';
  if (!form.data) e.data = 'Data é obrigatória.';
  const qty = parseInt(form.quantia, 10);
  if (qty !== 450 && qty !== 500) e.quantia = 'Selecione 450 mL ou 500 mL.';
  return e;
}

export default function Doacoes() {
  const {
    doacoes, doadores, enfermeiros, unidades,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  } = useDoacoes();

  const [editing, setEditing] = useState(null);   // doação em edição (ou null)
  const [deletingTarget, setDeletingTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');
  const [filterInicio, setFilterInicio] = useState('');
  const [filterFim, setFilterFim] = useState('');
  const { alert, showAlert } = useAlert();
  const modal = useBsModal();
  const delModal = useBsModal();
  const viewModal = useBsModal();

  // O backend só aceita doação de doador APTO. No cadastro, listamos apenas
  // APTOs; na edição, garantimos que o doador atual continue selecionável.
  const doadorOptions = useMemo(() => {
    const aptos = doadores.filter((d) => d.status === 'APTO');
    if (editing?.doador && !aptos.some((d) => d.id === editing.doador.id)) {
      return [editing.doador, ...aptos];
    }
    return aptos;
  }, [doadores, editing]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return doacoes.filter((d) => {
      const doadorNome = d.doador?.nome ?? '';
      const enfNome = d.enfermeiro?.nome ?? '';
      const uniNome = d.unidadeColeta?.nome ?? '';
      const matchSearch =
        doadorNome.toLowerCase().includes(q) ||
        enfNome.toLowerCase().includes(q) ||
        uniNome.toLowerCase().includes(q) ||
        String(d.id).includes(search);
      const matchData =
        (!filterInicio || (d.data && d.data >= filterInicio)) &&
        (!filterFim || (d.data && d.data <= filterFim));
      return matchSearch && matchData;
    });
  }, [doacoes, search, filterInicio, filterFim]);

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
      doadorId: String(d.doadorId ?? d.doador?.id ?? ''),
      enfermeiroId: String(d.enfermeiroId ?? d.enfermeiro?.id ?? ''),
      unidadeColetaId: String(d.unidadeColetaId ?? d.unidadeColeta?.id ?? ''),
      data: d.data ?? today(),
      quantia: d.quantia ?? 500,
    });
    setFormErrors({});
    modal.show();
  };

  const openView = (d) => { setViewTarget(d); viewModal.show(); };

  const save = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    try {
      if (editing) {
        await atualizar(editing.id, form);
        showAlert('success', `Doação <strong>#${editing.id}</strong> atualizada!`);
      } else {
        await criar(form);
        showAlert('success', 'Doação registrada com sucesso!');
      }
      modal.hide();
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao salvar doação.';
      showAlert('danger', msg);
    }
  };

  const openDelete = (d) => { if (busy) return; setDeletingTarget(d); delModal.show(); };
  const confirmDelete = async () => {
    if (!deletingTarget) return;
    try {
      await remover(deletingTarget.id);
      showAlert('warning', `Doação <strong>#${deletingTarget.id}</strong> removida.`);
      delModal.hide();
      setDeletingTarget(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.toUserMessage() : 'Erro ao remover doação.';
      showAlert('danger', msg);
      delModal.hide();
    }
  };

  const volPct = (q) => Math.min(100, Math.round(((q || 0) / 500) * 100));
  const totalVol = doacoes.reduce((s, d) => s + (d.quantia || 0), 0);
  const ymNow = today().slice(0, 7);
  const thisMonth = doacoes.filter((d) => (d.data || '').startsWith(ymNow)).length;

  return (
    <PageLayout title="Doações" subtitle="Controle de todas as doações realizadas"
      action={
        <button className="btn btn-danger text-white fw-semibold d-inline-flex align-items-center gap-2 py-1 px-3 border-0 shadow-sm"
          style={{ fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }} onClick={openCreate} disabled={busy}>
          <i className="bi bi-plus-lg"></i><span className="d-none d-sm-inline">Nova Doação</span>
        </button>
      }>

      <div className="row row-cols-2 row-cols-lg-4 g-2 g-sm-3 mb-3 mb-sm-4">
        <StatCard icon="bi-droplet-fill" value={doacoes.length.toLocaleString('pt-BR')} label="Total de Doações" bgColor="#FDECEA" iconColor="#C0392B" />
        <StatCard icon="bi-moisture" value={`${(totalVol / 1000).toFixed(1)}L`} label="Volume Total" bgColor="#E8F8F5" iconColor="#1ABC9C" />
        <StatCard icon="bi-calendar-check" value={thisMonth} label="Este Mês" bgColor="#EBF5FB" iconColor="#2980B9" />
        <StatCard icon="bi-hospital" value={unidades.length} label="Unidades de Coleta" bgColor="#EAFAF1" iconColor="#27AE60" />
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

      <TableCard title="Histórico de Doações" count={filtered.length}
        filters={<>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar doação…" />
          <DateInput label="De" value={filterInicio} onChange={setFilterInicio} max={filterFim || undefined} />
          <DateInput label="Até" value={filterFim} onChange={setFilterFim} min={filterInicio || undefined} />
          {(filterInicio || filterFim) && (
            <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 flex-shrink-0"
              style={{ borderRadius: 8, fontSize: 12, height: 36, borderColor: '#E2E8F0' }}
              onClick={() => { setFilterInicio(''); setFilterFim(''); }} title="Limpar período">
              <i className="bi bi-x-lg"></i><span className="d-none d-sm-inline">Limpar</span>
            </button>
          )}
        </>}
        footer={<Pagination current={1} total={filtered.length} onPrev={() => {}} onNext={() => {}} />}>

        {loading ? (
          <div className="text-center text-secondary py-5 px-3" style={{ fontSize: 13.5 }}>
            <div className="spinner-border text-danger mb-2" role="status" style={{ width: 28, height: 28 }}>
              <span className="visually-hidden">Carregando…</span>
            </div>
            <div>Carregando doações…</div>
          </div>
        ) : (<>
          <div className="table-responsive d-none d-md-block">
            <table className="table table-borderless table-hover mb-0" style={{ fontSize: 13 }}>
              <thead>
                <tr className="table-header-cell">
                  {['ID', 'Doador', 'Tipo', 'Enfermeiro', 'Unidade de Coleta', 'Data', 'Volume', 'Ações'].map((h, i) => (
                    <th key={h} className={`py-2 px-3 fw-bold text-nowrap${i === 7 ? ' text-end' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan={8} className="p-0 border-0"><EmptyState message="Nenhuma doação encontrada." /></td></tr>
                ) : filtered.map((d) => (
                  <tr key={d.id} className="align-middle">
                    <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">#{d.id}</span></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <div><div className="text-dark fw-bold">{d.doador?.nome ?? '—'}</div>
                        <div className="text-secondary" style={{ fontSize: 11 }}>{d.doador?.cpf ?? ''}</div></div>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle"><span className="blood-type-badge">{tipoSanguineoLabel(d.doador?.tipoSanguineo) || '—'}</span></td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{d.enfermeiro?.nome ?? '—'}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <span className="d-inline-block text-truncate fw-semibold rounded px-2 py-1"
                        style={{ maxWidth: 160, fontSize: 11, background: '#EBF5FB', color: '#1A6496' }} title={d.unidadeColeta?.nome}>{d.unidadeColeta?.nome ?? '—'}</span>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{formatDate(d.data)}</td>
                    <td className="py-3 px-3 border-bottom border-light-subtle">
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress" style={{ width: 60, height: 5 }}><div className="progress-bar bg-danger" style={{ width: `${volPct(d.quantia)}%` }}></div></div>
                        <span className="text-danger fw-bold" style={{ fontSize: 12 }}>{d.quantia}mL</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 border-bottom border-light-subtle text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <ActionBtn icon="bi-eye" color="#718096" onClick={() => openView(d)} title="Ver" />
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
            {!filtered.length ? <EmptyState message="Nenhuma doação encontrada." /> :
              filtered.map((d, i) => (
                <div key={d.id} className={`p-3 d-flex align-items-start gap-2${i !== filtered.length - 1 ? ' border-bottom border-light-subtle' : ''}`}>
                  <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 38, height: 38, background: '#FDECEA', color: '#C0392B', fontSize: 15 }}><i className="bi bi-droplet-fill"></i></div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="id-badge mb-1">#{d.id}</div>
                    <div className="fw-bold text-dark" style={{ fontSize: 13.5 }}>{d.doador?.nome ?? '—'}</div>
                    <div className="text-secondary mt-1 text-truncate" style={{ fontSize: 11.5 }}>{d.enfermeiro?.nome ?? '—'} · {d.unidadeColeta?.nome ?? '—'}</div>
                    <div className="d-flex flex-wrap gap-2 mt-2 align-items-center">
                      <span className="blood-type-badge">{tipoSanguineoLabel(d.doador?.tipoSanguineo) || '—'}</span>
                      <span className="text-secondary" style={{ fontSize: 11 }}>{formatDate(d.data)}</span>
                      <span className="text-danger fw-bold" style={{ fontSize: 11 }}>{d.quantia} mL</span>
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <ActionBtn icon="bi-eye" color="#718096" onClick={() => openView(d)} title="Ver" />
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
      <div className="modal fade" tabIndex="-1" aria-hidden="true" ref={modal.ref}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: 560 }}>
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-header border-bottom border-light-subtle p-3 p-sm-4">
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: 15 }}>{editing ? 'Editar Doação' : 'Nova Doação'}</div>
                <div className="text-secondary mt-1" style={{ fontSize: 11.5 }}>
                  {editing ? `Editando registro #${editing.id}` : 'Registre uma nova doação de sangue.'}
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => { modal.hide(); setFormErrors({}); }} disabled={saving}></button>
            </div>
            <div className="modal-body p-3 p-sm-4">
              <FormSectionLabel>Identificação</FormSectionLabel>
              <div className="row g-3 mb-4"><div className="col-12"><AutoIdField /></div></div>

              <FormSectionLabel>Dados da Doação</FormSectionLabel>
              <div className="row g-3 mb-3">
                <div className="col-12">
                  <FormField label="Doador" required error={formErrors.doadorId} hint="Apenas doadores APTOS podem doar.">
                    <select className="form-select focus-ring-danger text-dark" value={form.doadorId}
                      onChange={(e) => setForm((p) => ({ ...p, doadorId: e.target.value }))}
                      style={baseInputStyle(formErrors.doadorId)} disabled={saving}>
                      <option value="">Selecione o doador…</option>
                      {doadorOptions.map((d) => (
                        <option key={d.id} value={d.id}>
                          #{d.id} — {d.nome} ({tipoSanguineoLabel(d.tipoSanguineo)})
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-12">
                  <FormField label="Enfermeiro" required error={formErrors.enfermeiroId}>
                    <select className="form-select focus-ring-danger text-dark" value={form.enfermeiroId}
                      onChange={(e) => setForm((p) => ({ ...p, enfermeiroId: e.target.value }))}
                      style={baseInputStyle(formErrors.enfermeiroId)} disabled={saving}>
                      <option value="">Selecione o enfermeiro…</option>
                      {enfermeiros.map((en) => (
                        <option key={en.id} value={en.id}>#{en.id} — {en.nome} ({en.especialidade})</option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-12">
                  <FormField label="Unidade de Coleta" required error={formErrors.unidadeColetaId}>
                    <select className="form-select focus-ring-danger text-dark" value={form.unidadeColetaId}
                      onChange={(e) => setForm((p) => ({ ...p, unidadeColetaId: e.target.value }))}
                      style={baseInputStyle(formErrors.unidadeColetaId)} disabled={saving}>
                      <option value="">Selecione a unidade…</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>{u.nome} ({u.tipo_unidade})</option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <FormField label="Data" required error={formErrors.data}>
                    <input type="date" className="form-control focus-ring-danger text-dark" value={form.data}
                      onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
                      style={baseInputStyle(formErrors.data)} disabled={saving} />
                  </FormField>
                </div>
                <div className="col-12 col-sm-6">
                  <FormField label="Quantia (mL)" required error={formErrors.quantia} hint="Selecione 450 ou 500 mL.">
                    <select className="form-select focus-ring-danger text-dark" value={form.quantia}
                      onChange={(e) => setForm((p) => ({ ...p, quantia: parseInt(e.target.value, 10) }))}
                      style={baseInputStyle(formErrors.quantia)} disabled={saving}>
                      <option value={450}>450 mL</option>
                      <option value={500}>500 mL</option>
                    </select>
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
                  ? <><span className="spinner-border spinner-border-sm" role="status"></span> Salvando…</>
                  : <><i className="bi bi-floppy"></i> {editing ? 'Atualizar' : 'Salvar'}</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Ver */}
      <div className="modal fade" tabIndex="-1" aria-hidden="true" ref={viewModal.ref}>
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
            <div className="modal-header border-bottom border-light-subtle p-3 p-sm-4">
              <div className="fw-bold text-dark" style={{ fontSize: 15 }}>Detalhes da Doação</div>
              <button type="button" className="btn-close" onClick={() => viewModal.hide()}></button>
            </div>
            <div className="modal-body p-3 p-sm-4">
              {viewTarget && [
                { label: 'ID', value: `#${viewTarget.id}` },
                { label: 'Doador', value: `${viewTarget.doador?.nome ?? '—'} (${viewTarget.doador?.cpf ?? '—'})` },
                { label: 'Tipo Sanguíneo', value: tipoSanguineoLabel(viewTarget.doador?.tipoSanguineo) || '—' },
                { label: 'Enfermeiro', value: viewTarget.enfermeiro?.nome ?? '—' },
                { label: 'Unidade de Coleta', value: viewTarget.unidadeColeta?.nome ?? '—' },
                { label: 'Data', value: formatDate(viewTarget.data) },
                { label: 'Volume', value: `${viewTarget.quantia} mL` },
              ].map(({ label, value }, i, arr) => (
                <div key={label} className={`d-flex flex-column gap-1 py-2${i !== arr.length - 1 ? ' border-bottom border-light-subtle' : ''}`}>
                  <div className="text-secondary fw-bold text-uppercase" style={{ fontSize: 10.5, letterSpacing: '.5px' }}>{label}</div>
                  <div className="text-dark fw-medium" style={{ fontSize: 13.5 }}>{value}</div>
                </div>
              ))}
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
              <h6 className="fw-bold mb-2" style={{ fontSize: 15 }}>Excluir Doação?</h6>
              <p className="text-secondary mb-3 pb-1" style={{ fontSize: 13 }}>
                Excluir <strong>#{deletingTarget?.id}</strong> de {deletingTarget?.doador?.nome ?? 'doador'}? Esta ação não pode ser desfeita.
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
