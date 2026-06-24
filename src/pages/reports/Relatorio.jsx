import React, { useState, useMemo } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { FilterSelect } from '../../components/common/TableCard';

export function ReportLayout({ title, subtitle, children }) {
  const handlePrint = () => window.print();

  return (
    <PageLayout title={title} subtitle={subtitle}
      action={
        <button className="btn btn-outline-secondary fw-semibold d-inline-flex align-items-center gap-2 py-1 px-3"
          style={{ fontSize: 13, borderRadius: 8 }} onClick={handlePrint}>
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

export function RelSomatorio() {
  const data = [
    { tipo: 'A+', doadores: 312, doacoes: 890, volume: 445000, estoque: 500 },
    { tipo: 'A-', doadores: 98, doacoes: 210, volume: 105000, estoque: 200 },
    { tipo: 'B+', doadores: 215, doacoes: 610, volume: 305000, estoque: 450 },
    { tipo: 'B-', doadores: 67, doacoes: 145, volume: 72500, estoque: 150 },
    { tipo: 'AB+', doadores: 89, doacoes: 230, volume: 115000, estoque: 300 },
    { tipo: 'AB-', doadores: 34, doacoes: 78, volume: 39000, estoque: 100 },
    { tipo: 'O+', doadores: 389, doacoes: 1020, volume: 510000, estoque: 600 },
    { tipo: 'O-', doadores: 80, doacoes: 238, volume: 119000, estoque: 80 },
  ];
  const ranked = [...data].sort((a, b) => b.doadores - a.doadores);
  return (
    <ReportLayout title="Somatório por Tipo Sanguíneo em Doações" subtitle="Relatório de doações agrupadas por tipo sanguíneo">
      <ReportTable
        headers={['Classificação', 'Tipo Sanguíneo', 'Quantidade de Doadores', 'Volume (mL)']}
        rows={ranked.map((d, i) => (
          <tr key={d.tipo} className="align-middle">
            <td className="py-3 px-3 border-bottom border-light-subtle">
              <span className={`fw-bold rounded-circle d-inline-flex align-items-center justify-content-center ${i < 3 ? 'text-danger' : 'text-secondary'}`}
                style={{ width: 28, height: 28, fontSize: 12, background: i < 3 ? '#FDECEA' : '#F4F6F9' }}>{i + 1}º</span>
            </td>
            <td className="py-3 px-3 border-bottom border-light-subtle"><span className="blood-type-badge" style={{ fontSize: 14 }}>{d.tipo}</span></td>
            <td className="py-3 px-3 border-bottom border-light-subtle text-dark">{d.doadores.toLocaleString('pt-BR')}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle text-danger fw-bold">{d.volume.toLocaleString('pt-BR')}</td>
          </tr>
        ))}
      />
    </ReportLayout>
  );
}

const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function RelDoadores() {
  const data = [
    { id: 'D-001', nome: 'Ana Paula Ferreira', cpf: '123.456.789-01', cidade: 'Vitória/ES', tipo: 'A+', doacoes: 8, status: 'Apto para Doação', ultima: '02/04/2025' },
    { id: 'D-003', nome: 'Fernanda Lima', cpf: '234.567.890-12', cidade: 'Rio de Janeiro/RJ', tipo: 'B+', doacoes: 5, status: 'Apto para Doação', ultima: '18/03/2025' },
    { id: 'D-005', nome: 'Luciana Santos', cpf: '345.678.901-23', cidade: 'Cachoeiro/ES', tipo: 'O+', doacoes: 12, status: 'Apto para Doação', ultima: '02/04/2025' },
    { id: 'D-007', nome: 'Patrícia Alves', cpf: '456.789.012-34', cidade: 'Curitiba/PR', tipo: 'B-', doacoes: 3, status: 'Apto para Doação', ultima: '25/03/2025' },
  ];

  const [tipoFiltro, setTipoFiltro] = useState('');
  const filtrados = useMemo(
    () => (tipoFiltro ? data.filter((d) => d.tipo === tipoFiltro) : data),
    [tipoFiltro]
  );

  return (
    <ReportLayout title="Doadores Ativos" subtitle="Lista de doadores com status Apto para Doação e histórico de doações">
      <div className="d-flex flex-column flex-md-row gap-3 justify-content-md-between align-items-md-center mb-3">
        <p className="text-secondary mb-0" style={{ fontSize: 11.5 }}>
          {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
        </p>
        <FilterSelect value={tipoFiltro} onChange={setTipoFiltro}
          options={[{ value: '', label: 'Todos os tipos' }, ...TIPOS_SANGUINEOS.map((t) => ({ value: t, label: t }))]} />
      </div>
      <ReportTable
        headers={['ID', 'Nome', 'CPF', 'Cidade/UF', 'Tipo Sanguíneo', 'Total de Doações', 'Status', 'Data da Última Doação']}
        emptyMessage={tipoFiltro ? `Nenhum doador ativo do tipo ${tipoFiltro}.` : 'Nenhum dado encontrado.'}
        rows={filtrados.map((d) => (
          <tr key={d.id} className="align-middle">
            <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">{d.id}</span></td>
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-dark">{d.nome}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{d.cpf}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{d.cidade}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle"><span className="blood-type-badge">{d.tipo}</span></td>
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-danger">{d.doacoes}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle"><span className="fw-semibold rounded-pill bg-success-subtle text-success" style={{ fontSize: 11, padding: '2px 9px' }}>{d.status}</span></td>
            <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{d.ultima}</td>
          </tr>
        ))}
      />
    </ReportLayout>
  );
}

export function RelMaioresSolicitantes() {
  const data = [
    { pos: 1, hospital: 'Hospital Estadual Central', tipo: 'Público', solicitacoes: 28, volume: 45000 },
    { pos: 2, hospital: 'Hospital Santa Casa de Misericórdia', tipo: 'Filantrópico', solicitacoes: 21, volume: 38500 },
    { pos: 3, hospital: 'Clínica São Lucas', tipo: 'Privado', solicitacoes: 15, volume: 27000 },
    { pos: 4, hospital: 'UPA Cachoeiro', tipo: 'Público', solicitacoes: 13, volume: 19000 },
    { pos: 5, hospital: 'Hospital Mater Dei', tipo: 'Privado', solicitacoes: 10, volume: 15500 },
  ];
  return (
    <ReportLayout title="Maiores Solicitantes" subtitle="Ranking de hospitais por volume de solicitações">
      <ReportTable
        headers={['#', 'Hospital', 'Tipo', 'Solicitações', 'Volume (mL)']}
        rows={data.map((d) => (
          <tr key={d.pos} className="align-middle">
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-danger" style={{ fontSize: 18 }}>#{d.pos}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-dark">{d.hospital}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle text-secondary" style={{ fontSize: 12.5 }}>{d.tipo}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-dark">{d.solicitacoes}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-danger">{d.volume.toLocaleString('pt-BR')}</td>
          </tr>
        ))}
      />
    </ReportLayout>
  );
}

export function RelSolicitacoesHospital() {
  const data = [
    { id: 'SOL-001', hospital: 'Hospital Estadual Central', data: '10/03/2025', status: 'Em Aberto', urgencia: 'Alta', volume: 3250 },
    { id: 'SOL-002', hospital: 'UPA Cachoeiro', data: '14/03/2025', status: 'Finalizada', urgencia: 'Baixa', volume: 500 },
    { id: 'SOL-003', hospital: 'Clínica São Lucas', data: '18/03/2025', status: 'Em Aberto', urgencia: 'Média', volume: 1500 },
    { id: 'SOL-004', hospital: 'Hospital Mater Dei', data: '22/03/2025', status: 'Cancelada', urgencia: 'Baixa', volume: 500 },
    { id: 'SOL-005', hospital: 'Hospital Santa Casa', data: '01/04/2025', status: 'Em Aberto', urgencia: 'Alta', volume: 3500 },
  ];
  const stCls = (s) => s === 'Em Aberto' ? 'bg-primary-subtle text-primary-emphasis' : s === 'Finalizada' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
  return (
    <ReportLayout title="Solicitações por Hospital" subtitle="Histórico detalhado de solicitações por hospital">
      <ReportTable
        headers={['ID', 'Hospital', 'Data', 'Status', 'Urgência', 'Volume (mL)']}
        rows={data.map((d) => (
          <tr key={d.id} className="align-middle">
            <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">{d.id}</span></td>
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-dark">{d.hospital}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{d.data}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle">
              <span className={`fw-semibold rounded-pill ${stCls(d.status)}`} style={{ fontSize: 11, padding: '2px 9px' }}>{d.status}</span>
            </td>
            <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{d.urgencia}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-danger">{d.volume.toLocaleString('pt-BR')}</td>
          </tr>
        ))}
      />
    </ReportLayout>
  );
}

export function RelAgendaCampanhas() {
  const data = [
    { id: 'CAM-001', nome: 'Campanha Julho Vermelho', data: '01/07/2025', unidade: 'Hemocentro Central de Vitória', cidade: 'Vitória/ES', tipo: 'Todos', meta: 5000, coletado: 3200 },
    { id: 'CAM-002', nome: 'Doe Sangue, Doe Vida', data: '15/06/2025', unidade: 'Banco de Sangue Paulista', cidade: 'São Paulo/SP', tipo: 'O-', meta: 2000, coletado: 2000 },
    { id: 'CAM-003', nome: 'Hemovida 2025', data: '10/08/2025', unidade: 'Unidade Móvel Cachoeiro', cidade: 'Cachoeiro/ES', tipo: 'A+', meta: 1500, coletado: 0 },
    { id: 'CAM-004', nome: 'Solidariedade em Ação', data: '20/05/2025', unidade: 'Hemocentro BH', cidade: 'Belo Horizonte/MG', tipo: 'B+', meta: 3000, coletado: 2800 },
    { id: 'CAM-005', nome: 'Maratona do Sangue', data: '05/09/2025', unidade: 'Unidade Itinerante Sul', cidade: 'Curitiba/PR', tipo: 'AB-', meta: 1000, coletado: 0 },
  ];
  const pct = (c) => Math.min(100, Math.round((c.coletado / c.meta) * 100));
  return (
    <ReportLayout title="Agenda de Campanhas" subtitle="Calendário de campanhas de coleta de sangue">
      <ReportTable
        headers={['ID', 'Campanha', 'Data', 'Unidade', 'Tipo', 'Progresso']}
        rows={data.map((d) => (
          <tr key={d.id} className="align-middle">
            <td className="py-3 px-3 border-bottom border-light-subtle"><span className="id-badge">{d.id}</span></td>
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-dark">{d.nome}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle text-dark" style={{ fontSize: 12.5 }}>{d.data}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle text-secondary" style={{ fontSize: 12 }}>{d.unidade}<br /><span style={{ fontSize: 10.5 }}>{d.cidade}</span></td>
            <td className="py-3 px-3 border-bottom border-light-subtle"><span className="blood-type-badge">{d.tipo}</span></td>
            <td className="py-3 px-3 border-bottom border-light-subtle" style={{ minWidth: 140 }}>
              <div className="d-flex align-items-center gap-2">
                <div className="progress flex-grow-1" style={{ height: 5 }}><div className="progress-bar bg-danger" style={{ width: `${pct(d)}%` }}></div></div>
                <span className="fw-bold text-secondary" style={{ fontSize: 11 }}>{pct(d)}%</span>
              </div>
              <div className="text-secondary mt-1" style={{ fontSize: 10.5 }}>{d.coletado.toLocaleString('pt-BR')} / {d.meta.toLocaleString('pt-BR')} mL</div>
            </td>
          </tr>
        ))}
      />
    </ReportLayout>
  );
}

export function RelColetasCidade() {
  const data = [
    { cidade: 'Vitória', uf: 'ES', coletas: 1245, volume: 622500, doadores: 389 },
    { cidade: 'São Paulo', uf: 'SP', coletas: 987, volume: 493500, doadores: 312 },
    { cidade: 'Rio de Janeiro', uf: 'RJ', coletas: 654, volume: 327000, doadores: 215 },
    { cidade: 'Belo Horizonte', uf: 'MG', coletas: 421, volume: 210500, doadores: 145 },
    { cidade: 'Cachoeiro de Itapemirim', uf: 'ES', coletas: 398, volume: 199000, doadores: 134 },
    { cidade: 'Salvador', uf: 'BA', coletas: 289, volume: 144500, doadores: 98 },
    { cidade: 'Curitiba', uf: 'PR', coletas: 245, volume: 122500, doadores: 87 },
  ];
  return (
    <ReportLayout title="Coletas por Cidade" subtitle="Distribuição geográfica das coletas de sangue">
      <ReportTable
        headers={['Cidade', 'UF', 'Coletas', 'Volume (mL)', 'Doadores']}
        rows={data.map((d) => (
          <tr key={d.cidade} className="align-middle">
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-dark">{d.cidade}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle">
              <span className="fw-bold rounded px-2" style={{ fontSize: 11, background: '#EBF5FB', color: '#2980B9', padding: '2px 8px' }}>{d.uf}</span>
            </td>
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-dark">{d.coletas.toLocaleString('pt-BR')}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle fw-bold text-danger">{d.volume.toLocaleString('pt-BR')}</td>
            <td className="py-3 px-3 border-bottom border-light-subtle text-dark">{d.doadores.toLocaleString('pt-BR')}</td>
          </tr>
        ))}
      />
    </ReportLayout>
  );
}
