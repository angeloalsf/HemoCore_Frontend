import React, { useMemo } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { FilterSelect, DateInput } from '../../components/common/TableCard';
import { useDoadoresAtivos } from '../../hooks/useDoadoresAtivos';
import { useSomatorioTipoSanguineo } from '../../hooks/useSomatorioTipoSanguineo';
import { useAgendaCampanhas } from '../../hooks/useAgendaCampanhas';
import { useColetasPorCidade } from '../../hooks/useColetasPorCidade';
import { useMaioresSolicitantes } from '../../hooks/useMaioresSolicitantes';
import { useSolicitacoesHospital } from '../../hooks/useSolicitacoesHospital';
import { tipoSanguineoLabel } from '../../services/lookupService';

function formatDataBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function ReportLayout({ title, subtitle, children }) {
  return (
    <PageLayout title={title} subtitle={subtitle}
      action={
        <button className="btn btn-outline-secondary fw-semibold d-inline-flex align-items-center gap-2 py-1 px-3"
          style={{ fontSize: 13, borderRadius: 8 }} onClick={() => window.print()}>
          <i className="bi bi-printer"></i><span className="d-none d-sm-inline">Imprimir</span>
        </button>
      }>
      {children}
    </PageLayout>
  );
}

function ReportTable({ headers, rows, emptyMessage = 'Nenhum dado encontrado.' }) {
  return (
    <div className="card border border-light-subtle rounded-4 overflow-hidden" style={{ background: '#fff' }}>
      <div className="table-responsive">
        <table className="table table-borderless table-hover mb-0" style={{ fontSize: 13 }}>
          <thead>
            <tr className="table-header-cell">
              {headers.map((h) => <th key={h} className="py-2 px-3 fw-bold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr><td colSpan={headers.length} className="text-center text-secondary py-5" style={{ fontSize: 13.5 }}>
                <i className="bi bi-inbox d-block mb-2 opacity-50" style={{ fontSize: 30 }}></i>{emptyMessage}
              </td></tr>
            ) : rows}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingCard({ message }) {
  return (
    <div className="card border border-light-subtle rounded-4 text-center text-secondary py-5 px-3" style={{ background: '#fff', fontSize: 13.5 }}>
      <div className="spinner-border text-danger mb-2 mx-auto" role="status" style={{ width: 28, height: 28 }}>
        <span className="visually-hidden">Carregando…</span>
      </div>
      <div>{message}</div>
    </div>
  );
}

function ErrorBanner({ message, onRetry, loading }) {
  return (
    <div className="alert bg-danger-subtle text-danger border border-danger-subtle d-flex align-items-center justify-content-between gap-2 py-2 px-3 shadow-sm mb-3"
      style={{ borderRadius: 10, fontSize: 13 }}>
      <span><i className="bi bi-exclamation-triangle-fill me-2"></i>{message}</span>
      <button className="btn btn-sm btn-danger text-white fw-semibold border-0" style={{ borderRadius: 8, fontSize: 12 }}
        onClick={onRetry} disabled={loading}>
        <i className="bi bi-arrow-clockwise me-1"></i>Tentar novamente
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relatório: Somatório por Tipo Sanguíneo
// ---------------------------------------------------------------------------
export function RelSomatorio() {
  const {
    itens, dataInicio, setDataInicio, dataFim, setDataFim,
    loading, loadError, carregar,
  } = useSomatorioTipoSanguineo();

  const limparPeriodo = () => { setDataInicio(''); setDataFim(''); };
  const temPeriodo = Boolean(dataInicio || dataFim);

  return (
    <ReportLayout title="Somatório por Tipo Sanguíneo em Doações" subtitle="Relatório de doações agrupadas por tipo sanguíneo">
      {loadError && <ErrorBanner message={loadError} onRetry={() => carregar()} loading={loading} />}

      <div className="d-flex flex-column flex-md-row gap-3 justify-content-md-between align-items-md-center mb-3">
        <p className="text-secondary mb-0" style={{ fontSize: 11.5 }}>
          {loading ? 'Carregando…' : `${itens.length} tipo${itens.length !== 1 ? 's' : ''} sanguíneo${itens.length !== 1 ? 's' : ''} com doações`}
        </p>
        <div className="d-flex flex-wrap align-items-center gap-2" style={loading ? { opacity: 0.6 } : undefined}>
          <DateInput label="De" value={dataInicio} onChange={setDataInicio} max={dataFim || undefined} disabled={loading} />
          <DateInput label="Até" value={dataFim} onChange={setDataFim} min={dataInicio || undefined} disabled={loading} />
          {temPeriodo && (
            <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 flex-shrink-0"
              style={{ borderRadius: 8, fontSize: 12, height: 36, borderColor: '#E2E8F0' }}
              onClick={limparPeriodo} disabled={loading} title="Limpar período">
              <i className="bi bi-x-lg"></i><span className="d-none d-sm-inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {loading ? <LoadingCard message="Carregando somatório por tipo sanguíneo…" /> : (
        <ReportTable
          headers={['Classificação', 'Tipo Sanguíneo', 'Total de Doações']}
          emptyMessage={temPeriodo ? 'Nenhuma doação registrada no período selecionado.' : 'Nenhuma doação registrada.'}
          rows={itens.map((d, i) => (
            <tr key={d.tipoSanguineo || i} className="align-middle">
              <td className="py-3 px-3 border-bottom border-light-subtle">
                <span className={`fw-bold rounded-circle d-inline-flex align-items-center justify-content-center ${i < 3 ? 'text-danger' : 'text-secondary'}`}
                  style={{ width: 28, height: 28, fontSize: 12, background: i < 3 ? '#FDECEA' : '#F4F6F9' }}>{i + 1}º</span>
              </td>
              <td className="py-3 px-3 border-bottom border-light-subtle"><span className="blood-type-badge" style={{ fontSize: 14 }}>{d.tipoSanguineo}</span></td>
              <td className="py-3 px-3 border-bottom border-light-subtle text-danger fw-bold">{d.totalDoacoes.toLocaleString('pt-BR')}</td>
            </tr>
          ))}
        />
      )}
    </ReportLayout>
  );
}

// ---------------------------------------------------------------------------
// Relatório: Doadores Ativos
// ---------------------------------------------------------------------------
export function RelDoadores() {
  const {
    doadores, tiposSanguineos, tipoSanguineo, setTipoSanguineo,
    loading, loadError, carregar,
  } = useDoadoresAtivos();

  const tipoOptions = useMemo(
    () => [
      { value: '', label: 'Todos os tipos' },
      ...tiposSanguineos.map((t) => ({ value: String(t.id), label: tipoSanguineoLabel(t) })),
    ],
    [tiposSanguineos]
  );

  const tipoLabelSelecionado = useMemo(() => {
    const t = tiposSanguineos.find((x) => String(x.id) === String(tipoSanguineo));
    return t ? tipoSanguineoLabel(t) : '';
  }, [tiposSanguineos, tipoSanguineo]);

  return (
    <ReportLayout title="Doadores Ativos" subtitle="Lista de doadores com status Apto para Doação, ordenados pela última doação">
      {loadError && <ErrorBanner message={loadError} onRetry={() => carregar()} loading={loading} />}

      <div className="d-flex flex-column flex-md-row gap-3 justify-content-md-between align-items-md-center mb-3">
        <p className="text-secondary mb-0" style={{ fontSize: 11.5 }}>
          {loading ? 'Carregando…' : `${doadores.length} registro${doadores.length !== 1 ? 's' : ''} encontrado${doadores.length !== 1 ? 's' : ''}`}
        </p>
        <FilterSelect value={tipoSanguineo} onChange={setTipoSanguineo}
          options={tipoOptions} disabled={loading} style={loading ? { opacity: 0.6 } : undefined} />
      </div>

      {loading ? <LoadingCard message="Carregando doadores ativos…" /> : (
        <ReportTable
          headers={['Nome', 'CPF', 'UF', 'Tipo Sanguíneo', 'Status', 'Data da Última Doação']}
          emptyMessage={tipoLabelSelecionado ? `Nenhum doador ativo do tipo ${tipoLabelSelecionado}.` : 'Nenhum doador ativo encontrado.'}
          rows={doadores.map((d, i) => (
            <tr key={`${d.cpf}-${d.dataDoacao}-${i}`} className="align-middle">
              <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-dark">{d.nome}</td>
              <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{d.cpf}</td>
              <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{d.uf}</td>
              <td className="py-3 px-3 border-bottom border-light-subtle"><span className="blood-type-badge">{d.tipoSanguineo}</span></td>
              <td className="py-3 px-3 border-bottom border-light-subtle">
                <span className="fw-semibold rounded-pill bg-success-subtle text-success" style={{ fontSize: 11, padding: '2px 9px' }}>Apto para Doação</span>
              </td>
              <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{formatDataBR(d.dataDoacao)}</td>
            </tr>
          ))}
        />
      )}
    </ReportLayout>
  );
}

// ---------------------------------------------------------------------------
// Relatório: Agenda de Campanhas
// ---------------------------------------------------------------------------
export function RelAgendaCampanhas() {
  const {
    agenda, ufs, cidades, unidades,
    ufId, setUfId,
    cidadeId, setCidadeId,
    unidadeColetaId, setUnidadeColetaId,
    loading, loadError, carregar,
  } = useAgendaCampanhas();

  const ufOptions = useMemo(() => [
    { value: '', label: 'Todas as UFs' },
    ...ufs.map(u => ({ value: String(u.id), label: u.sigla })),
  ], [ufs]);

  const cidadeOptions = useMemo(() => [
    { value: '', label: 'Todas as cidades' },
    ...cidades.map(c => ({ value: String(c.id), label: c.nome })),
  ], [cidades]);

  const unidadeOptions = useMemo(() => [
    { value: '', label: 'Todas as unidades' },
    ...unidades.map(u => ({ value: String(u.id), label: u.nome })),
  ], [unidades]);

  const temFiltro = Boolean(ufId || cidadeId || unidadeColetaId);

  return (
    <ReportLayout title="Agenda de Campanhas" subtitle="Calendário de campanhas de coleta de sangue">
      {loadError && <ErrorBanner message={loadError} onRetry={() => carregar()} loading={loading} />}

      <div className="d-flex flex-column flex-md-row gap-3 justify-content-md-between align-items-md-center mb-3">
        <p className="text-secondary mb-0" style={{ fontSize: 11.5 }}>
          {loading ? 'Carregando…' : `${agenda.length} campanha${agenda.length !== 1 ? 's' : ''} encontrada${agenda.length !== 1 ? 's' : ''}`}
        </p>
        <div className="d-flex flex-wrap align-items-center gap-2" style={loading ? { opacity: 0.6 } : undefined}>
          <FilterSelect value={ufId} onChange={setUfId} options={ufOptions} disabled={loading} />
          <FilterSelect value={cidadeId} onChange={setCidadeId} options={cidadeOptions} disabled={loading || !ufId} />
          <FilterSelect value={unidadeColetaId} onChange={setUnidadeColetaId} options={unidadeOptions} disabled={loading || !cidadeId} />
          {temFiltro && (
            <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 flex-shrink-0"
              style={{ borderRadius: 8, fontSize: 12, height: 36, borderColor: '#E2E8F0' }}
              onClick={() => { setUfId(''); }} disabled={loading} title="Limpar filtros">
              <i className="bi bi-x-lg"></i><span className="d-none d-sm-inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {loading ? <LoadingCard message="Carregando agenda de campanhas…" /> : (
        <ReportTable
          headers={['Campanha', 'Data', 'Unidade / Cidade', 'Tipos', 'Progresso']}
          emptyMessage="Nenhuma campanha encontrada."
          rows={agenda.map((c) => {
            const totalMeta = (c.itensCampanha || []).reduce((s, it) => s + (it.metaColeta || 0), 0);
            const totalColetado = (c.itensCampanha || []).reduce((s, it) => s + (it.quantiaColetada || 0), 0);
            const pct = totalMeta > 0 ? Math.min(100, Math.round((totalColetado / totalMeta) * 100)) : 0;
            const tiposLabel = (c.itensCampanha || [])
              .map(it => it.tipoSanguineo ? `${it.tipoSanguineo.grupoABO}${it.tipoSanguineo.fatorRH ? '+' : '-'}` : null)
              .filter(Boolean).join(', ') || '—';
            const cidade = c.unidadeColeta?.cidade;
            const uf = cidade?.uf;
            return (
              <tr key={c.id} className="align-middle">
                <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-dark">{c.nome}</td>
                <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{formatDataBR(c.data)}</td>
                <td className="py-3 px-3 border-bottom border-light-subtle text-secondary" style={{ fontSize: 12 }}>
                  {c.unidadeColeta?.nome || '—'}
                  {cidade && <><br /><span style={{ fontSize: 10.5 }}>{cidade.nome}{uf ? `/${uf.sigla}` : ''}</span></>}
                </td>
                <td className="py-3 px-3 border-bottom border-light-subtle">
                  <span className="text-dark" style={{ fontSize: 12 }}>{tiposLabel}</span>
                </td>
                <td className="py-3 px-3 border-bottom border-light-subtle" style={{ minWidth: 140 }}>
                  <div className="d-flex align-items-center gap-2">
                    <div className="progress flex-grow-1" style={{ height: 5 }}>
                      <div className="progress-bar bg-danger" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="fw-bold text-secondary" style={{ fontSize: 11 }}>{pct}%</span>
                  </div>
                  <div className="text-secondary mt-1" style={{ fontSize: 10.5 }}>
                    {totalColetado.toLocaleString('pt-BR')} / {totalMeta.toLocaleString('pt-BR')} mL
                  </div>
                </td>
              </tr>
            );
          })}
        />
      )}
    </ReportLayout>
  );
}

// ---------------------------------------------------------------------------
// Relatório: Coletas por Cidade
// ---------------------------------------------------------------------------
export function RelColetasCidade() {
  const {
    coletas, ufs,
    ufId, setUfId,
    loading, loadError, carregar,
  } = useColetasPorCidade();

  const ufOptions = useMemo(() => [
    { value: '', label: 'Todas as UFs' },
    ...ufs.map(u => ({ value: String(u.id), label: u.sigla })),
  ], [ufs]);

  return (
    <ReportLayout title="Coletas por Cidade" subtitle="Distribuição geográfica das coletas de sangue">
      {loadError && <ErrorBanner message={loadError} onRetry={() => carregar()} loading={loading} />}

      <div className="d-flex flex-column flex-md-row gap-3 justify-content-md-between align-items-md-center mb-3">
        <p className="text-secondary mb-0" style={{ fontSize: 11.5 }}>
          {loading ? 'Carregando…' : `${coletas.length} cidade${coletas.length !== 1 ? 's' : ''} encontrada${coletas.length !== 1 ? 's' : ''}`}
        </p>
        <FilterSelect value={ufId} onChange={setUfId} options={ufOptions} disabled={loading} />
      </div>

      {loading ? <LoadingCard message="Carregando coletas por cidade…" /> : (
        <ReportTable
          headers={['Cidade', 'Status da Meta', 'Quantia Alcançada']}
          emptyMessage="Nenhuma coleta registrada."
          rows={coletas.map((d) => (
            <tr key={d.cidadeId} className="align-middle">
              <td className="py-3 px-3 border-bottom border-light-subtle">
                <span className="fw-bold text-dark">{d.cidade}</span>
                {d.uf && (
                  <span className="ms-2 fw-bold rounded px-2" style={{ fontSize: 11, background: '#EBF5FB', color: '#2980B9', padding: '2px 8px' }}>
                    {d.uf}
                  </span>
                )}
              </td>
              <td className="py-3 px-3 border-bottom border-light-subtle" style={{ minWidth: 180 }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className={`fw-semibold rounded-pill ${d.atingida ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
                    style={{ fontSize: 11, padding: '2px 9px' }}>
                    {d.atingida ? 'Atingida' : 'Não Atingida'}
                  </span>
                  <span className="text-secondary fw-semibold" style={{ fontSize: 11 }}>{d.progresso}%</span>
                </div>
                <div className="progress" style={{ height: 5 }}>
                  <div className={`progress-bar ${d.atingida ? 'bg-success' : 'bg-danger'}`} style={{ width: `${d.progresso}%` }}></div>
                </div>
                <div className="text-secondary mt-1" style={{ fontSize: 10.5 }}>
                  Meta: {d.metaTotal.toLocaleString('pt-BR')} mL
                </div>
              </td>
              <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-danger">
                {d.coletadoTotal.toLocaleString('pt-BR')} mL
              </td>
            </tr>
          ))}
        />
      )}
    </ReportLayout>
  );
}

// ---------------------------------------------------------------------------
// Relatório: Maiores Solicitantes
// ---------------------------------------------------------------------------
export function RelMaioresSolicitantes() {
  const {
    solicitantes, tiposSanguineos,
    tipoSanguineoId, setTipoSanguineoId,
    dataInicio, setDataInicio,
    dataFim, setDataFim,
    loading, loadError, carregar,
  } = useMaioresSolicitantes();

  const tipoOptions = useMemo(() => [
    { value: '', label: 'Todos os tipos' },
    ...tiposSanguineos.map(t => ({ value: String(t.id), label: tipoSanguineoLabel(t) })),
  ], [tiposSanguineos]);

  const temPeriodo = Boolean(dataInicio || dataFim);
  const limpar = () => { setDataInicio(''); setDataFim(''); setTipoSanguineoId(''); };

  return (
    <ReportLayout title="Maiores Solicitantes" subtitle="Ranking de hospitais por volume de solicitações de sangue">
      {loadError && <ErrorBanner message={loadError} onRetry={() => carregar()} loading={loading} />}

      <div className="d-flex flex-column flex-md-row gap-3 justify-content-md-between align-items-md-center mb-3">
        <p className="text-secondary mb-0" style={{ fontSize: 11.5 }}>
          {loading ? 'Carregando…' : `${solicitantes.length} registro${solicitantes.length !== 1 ? 's' : ''} encontrado${solicitantes.length !== 1 ? 's' : ''}`}
        </p>
        <div className="d-flex flex-wrap align-items-center gap-2" style={loading ? { opacity: 0.6 } : undefined}>
          <FilterSelect value={tipoSanguineoId} onChange={setTipoSanguineoId} options={tipoOptions} disabled={loading} />
          <DateInput label="De" value={dataInicio} onChange={setDataInicio} max={dataFim || undefined} disabled={loading} />
          <DateInput label="Até" value={dataFim} onChange={setDataFim} min={dataInicio || undefined} disabled={loading} />
          {(tipoSanguineoId || temPeriodo) && (
            <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 flex-shrink-0"
              style={{ borderRadius: 8, fontSize: 12, height: 36, borderColor: '#E2E8F0' }}
              onClick={limpar} disabled={loading} title="Limpar filtros">
              <i className="bi bi-x-lg"></i><span className="d-none d-sm-inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {loading ? <LoadingCard message="Carregando maiores solicitantes…" /> : (
        <ReportTable
          headers={['#', 'Hospital', 'CNPJ', 'Tipo Sanguíneo', 'Quantidade de Sangue']}
          emptyMessage="Nenhuma solicitação encontrada para os filtros selecionados."
          rows={solicitantes.map((d, i) => (
            <tr key={`${d.hospital}-${d.tipoSanguineo}-${i}`} className="align-middle">
              <td className="py-3 px-3 border-bottom border-light-subtle">
                <span className={`fw-bold rounded-circle d-inline-flex align-items-center justify-content-center ${i < 3 ? 'text-danger' : 'text-secondary'}`}
                  style={{ width: 28, height: 28, fontSize: 12, background: i < 3 ? '#FDECEA' : '#F4F6F9' }}>{i + 1}º</span>
              </td>
              <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-dark">{d.hospital}</td>
              <td className="py-3 px-3 border-bottom border-light-subtle text-secondary" style={{ fontSize: 12.5 }}>{d.cnpj || '—'}</td>
              <td className="py-3 px-3 border-bottom border-light-subtle"><span className="blood-type-badge">{d.tipoSanguineo}</span></td>
              <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-danger">
                {d.quantidade.toLocaleString('pt-BR')} mL
              </td>
            </tr>
          ))}
        />
      )}
    </ReportLayout>
  );
}

// ---------------------------------------------------------------------------
// Relatório: Solicitações por Hospital
// ---------------------------------------------------------------------------
export function RelSolicitacoesHospital() {
  const {
    itens, hospitais,
    hospitalId, setHospitalId,
    dataInicio, setDataInicio,
    dataFim, setDataFim,
    loading, loadError, carregar,
  } = useSolicitacoesHospital();

  const hospitalOptions = useMemo(() => [
    { value: '', label: 'Todos os hospitais' },
    ...hospitais.map(h => ({ value: String(h.id), label: h.nome })),
  ], [hospitais]);

  const temFiltro = Boolean(hospitalId || dataInicio || dataFim);
  const limpar = () => { setHospitalId(''); setDataInicio(''); setDataFim(''); };

  return (
    <ReportLayout title="Solicitações por Hospital" subtitle="Histórico detalhado de solicitações de sangue por hospital">
      {loadError && <ErrorBanner message={loadError} onRetry={() => carregar()} loading={loading} />}

      <div className="d-flex flex-column flex-md-row gap-3 justify-content-md-between align-items-md-center mb-3">
        <p className="text-secondary mb-0" style={{ fontSize: 11.5 }}>
          {loading ? 'Carregando…' : `${itens.length} item${itens.length !== 1 ? 'ns' : ''} encontrado${itens.length !== 1 ? 's' : ''}`}
        </p>
        <div className="d-flex flex-wrap align-items-center gap-2" style={loading ? { opacity: 0.6 } : undefined}>
          <FilterSelect value={hospitalId} onChange={setHospitalId} options={hospitalOptions} disabled={loading} />
          <DateInput label="De" value={dataInicio} onChange={setDataInicio} max={dataFim || undefined} disabled={loading} />
          <DateInput label="Até" value={dataFim} onChange={setDataFim} min={dataInicio || undefined} disabled={loading} />
          {temFiltro && (
            <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 flex-shrink-0"
              style={{ borderRadius: 8, fontSize: 12, height: 36, borderColor: '#E2E8F0' }}
              onClick={limpar} disabled={loading} title="Limpar filtros">
              <i className="bi bi-x-lg"></i><span className="d-none d-sm-inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {loading ? <LoadingCard message="Carregando solicitações por hospital…" /> : (
        <ReportTable
          headers={['Hospital', 'Tipo Sanguíneo', 'Quantia', 'Data de Solicitação']}
          emptyMessage="Nenhuma solicitação encontrada para os filtros selecionados."
          rows={itens.map((d, i) => (
            <tr key={`${d.hospital}-${d.tipoSanguineo}-${d.data}-${i}`} className="align-middle">
              <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-dark">{d.hospital}</td>
              <td className="py-3 px-3 border-bottom border-light-subtle"><span className="blood-type-badge">{d.tipoSanguineo}</span></td>
              <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-danger">
                {d.quantidade.toLocaleString('pt-BR')} mL
              </td>
              <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>
                {formatDataBR(d.data)}
              </td>
            </tr>
          ))}
        />
      )}
    </ReportLayout>
  );
}
