import React from 'react';
import { NavLink } from 'react-router-dom';

const closeDrawer = () => {
  const el = document.getElementById('hcDrawer');
  if (!el) return;
  import('bootstrap').then(({ Offcanvas }) => {
    Offcanvas.getInstance(el)?.hide();
  });
};

const DrawerLink = ({ to, icon, children }) => (
  <NavLink to={to} onClick={closeDrawer} className={({ isActive }) =>
    `text-decoration-none rounded-2 px-2 py-2 mb-1 d-flex align-items-center gap-2 fw-medium${isActive ? ' drawer-link-active text-white' : ' text-white text-opacity-50'}`
  } style={{ fontSize: 13 }}>
    <i className={`bi ${icon} fs-6`}></i> {children}
  </NavLink>
);

const SectionLabel = ({ children }) => (
  <div className="text-white text-opacity-25 text-uppercase px-2 mb-1 mt-3" style={{ fontSize: 9, letterSpacing: '1.6px' }}>
    {children}
  </div>
);

export default function Drawer() {
  return (
    <div className="offcanvas offcanvas-start text-white border-0" tabIndex="-1" id="hcDrawer"
      style={{ width: 280, maxWidth: '85vw', backgroundColor: '#1A2332', zIndex: 1045 }}>
      <div className="offcanvas-header border-bottom border-light border-opacity-10 py-3 px-3">
        <div className="d-flex align-items-center gap-2">
          <div className="bg-danger rounded-2 d-flex align-items-center justify-content-center text-white flex-shrink-0" style={{ width: 32, height: 32 }}>
            <i className="bi bi-droplet-fill fs-6"></i>
          </div>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, lineHeight: 1 }}>HemoCore</div>
            <div className="text-white text-opacity-50 text-uppercase" style={{ fontSize: 9, letterSpacing: 1 }}>Banco de Sangue</div>
          </div>
        </div>
        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
      </div>

      <div className="offcanvas-body p-2 d-flex flex-column overflow-auto">
        <SectionLabel>Principal</SectionLabel>
        <DrawerLink to="/login" icon="bi-box-arrow-in-right">Entrar</DrawerLink>

        <SectionLabel>Cadastros</SectionLabel>
        <DrawerLink to="/cidades" icon="bi-geo-alt">Cidades</DrawerLink>
        <DrawerLink to="/doadores" icon="bi-person-heart">Doadores</DrawerLink>
        <DrawerLink to="/hospitais" icon="bi-hospital">Hospitais</DrawerLink>
        <DrawerLink to="/recepcionistas" icon="bi-person-badge">Recepcionistas</DrawerLink>
        <DrawerLink to="/tipos-sanguineos" icon="bi-droplet-half">Tipos Sanguíneos</DrawerLink>
        <DrawerLink to="/unidades-coleta" icon="bi-building-add">Unidades de Coleta</DrawerLink>

        <SectionLabel>Processos</SectionLabel>
        <DrawerLink to="/campanhas" icon="bi-megaphone">Campanhas</DrawerLink>
        <DrawerLink to="/doacoes" icon="bi-droplet">Doações</DrawerLink>
        <DrawerLink to="/solicitacoes" icon="bi-file-earmark-medical">Solicitações</DrawerLink>

        <SectionLabel>Relatórios</SectionLabel>
        <DrawerLink to="/relatorios/agenda-campanhas" icon="bi-calendar-event">Agenda de Campanhas</DrawerLink>
        <DrawerLink to="/relatorios/coletas-cidade" icon="bi-geo-fill">Coletas por Cidade</DrawerLink>
        <DrawerLink to="/relatorios/doadores" icon="bi-people">Doadores Ativos</DrawerLink>
        <DrawerLink to="/relatorios/maiores-solicitantes" icon="bi-trophy">Maiores Solicitantes</DrawerLink>
        <DrawerLink to="/relatorios/solicitacoes-hospital" icon="bi-clipboard2-pulse">Sol. por Hospital</DrawerLink>
        <DrawerLink to="/relatorios/somatorio" icon="bi-bar-chart-line">Somatório por Tipo Sanguíneo</DrawerLink>

        <SectionLabel>Sistema</SectionLabel>
        <a href="#" className="text-decoration-none rounded-2 px-2 py-2 mb-1 d-flex align-items-center gap-2 text-white text-opacity-50 fw-medium" style={{ fontSize: 13 }}>
          <i className="bi bi-gear fs-6"></i> Configurações
        </a>
      </div>

      <div className="mt-auto p-3 border-top border-light border-opacity-10 text-white text-opacity-25" style={{ fontSize: 11 }}>
        HemoCore v1.0.0 · © 2026
      </div>
    </div>
  );
}
