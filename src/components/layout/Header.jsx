import React from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/validation';

const CADASTROS_ITEMS = [
  { to: '/cidades', icon: 'bi-geo-alt', label: 'Cidades' },
  { to: '/doadores', icon: 'bi-person-heart', label: 'Doadores' },
  { to: '/hospitais', icon: 'bi-hospital', label: 'Hospitais' },
  { to: '/recepcionistas', icon: 'bi-person-badge', label: 'Recepcionistas' },
  { to: '/tipos-sanguineos', icon: 'bi-droplet-half', label: 'Tipos Sanguíneos' },
  { to: '/unidades-coleta', icon: 'bi-building-add', label: 'Unidades de Coleta' },
];

const PROCESSOS_ITEMS = [
  { to: '/campanhas', icon: 'bi-megaphone', label: 'Campanhas' },
  { to: '/doacoes', icon: 'bi-droplet', label: 'Doações' },
  { to: '/solicitacoes', icon: 'bi-file-earmark-medical', label: 'Solicitações' },
];

const RELATORIOS_ITEMS = [
  { to: '/relatorios/agenda-campanhas', icon: 'bi-calendar-event', label: 'Agenda de Campanhas' },
  { to: '/relatorios/coletas-cidade', icon: 'bi-geo-fill', label: 'Coletas por Cidade' },
  { to: '/relatorios/doadores', icon: 'bi-people', label: 'Doadores Ativos' },
  { to: '/relatorios/maiores-solicitantes', icon: 'bi-trophy', label: 'Maiores Solicitantes' },
  { to: '/relatorios/solicitacoes-hospital', icon: 'bi-clipboard2-pulse', label: 'Sol. por Hospital' },
  { to: '/relatorios/somatorio', icon: 'bi-bar-chart-line', label: 'Somatório por Tipo Sanguíneo' },
];

function NavDropdown({ label, icon, items, groupPaths }) {
  const { pathname } = useLocation();
  const isActive = groupPaths.some((p) => pathname.startsWith(p));

  return (
    <div className="dropdown h-100 d-flex align-items-center mx-1">
      <div
        className={`fw-medium d-flex align-items-center gap-1 px-2 h-100 user-select-none${isActive ? ' text-white nav-link-active' : ' text-white text-opacity-50'}`}
        style={{ fontSize: 13, cursor: 'pointer', borderBottom: isActive ? '2px solid rgba(192,57,43,.6)' : '2px solid transparent' }}
        data-bs-toggle="dropdown" aria-expanded="false"
      >
        <i className={`bi ${icon}`} style={{ fontSize: 14 }}></i> {label} <i className="bi bi-chevron-down ms-1" style={{ fontSize: 10 }}></i>
      </div>
      <ul className="dropdown-menu shadow-sm border border-light-subtle mt-0 pt-2 pb-2"
        style={{ minWidth: 220, borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
        {items.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} className={({ isActive: a }) =>
              `dropdown-item d-flex align-items-center gap-2 py-2 px-3${a ? ' nav-dropdown-item-active' : ' text-dark'}`
            } style={{ fontSize: 13 }}>
              <i className={`bi ${item.icon}`} style={{ fontSize: 14 }}></i> {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Header() {
  const { user } = useAuth();
  const initials = user ? getInitials(user.split('@')[0].replace(/[._]/g, ' ')) : 'AD';

  return (
    <header className="navbar fixed-top shadow-sm flex-nowrap align-items-center navbar-hemo"
      style={{ height: 58, zIndex: 1040, padding: 0 }}>

      <button className="btn btn-link text-white d-md-none text-decoration-none ms-2 flex-shrink-0" type="button"
        data-bs-toggle="offcanvas" data-bs-target="#hcDrawer"
        style={{ width: 36, height: 36, padding: 0, background: 'rgba(255,255,255,.08)', borderRadius: 6 }}>
        <i className="bi bi-list fs-5"></i>
      </button>

      <Link to="/doadores" className="d-flex align-items-center gap-2 text-decoration-none h-100 px-3 border-end border-light border-opacity-10" style={{ flexShrink: 0 }}>
        <div className="bg-danger rounded-2 d-flex align-items-center justify-content-center text-white" style={{ width: 32, height: 32 }}>
          <i className="bi bi-droplet-fill" style={{ fontSize: 15 }}></i>
        </div>
        <div>
          <div className="text-white" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, lineHeight: 1, whiteSpace: 'nowrap' }}>HemoCore</div>
          <div className="text-white text-opacity-50 text-uppercase" style={{ fontSize: 8.5, letterSpacing: 1, whiteSpace: 'nowrap' }}>Banco de Sangue</div>
        </div>
      </Link>

      <nav className="d-none d-md-flex align-items-center h-100 flex-grow-1 px-1">
        <NavLink to="/login" className={({ isActive }) =>
          `text-decoration-none fw-medium d-flex align-items-center gap-1 px-2 mx-1 h-100${isActive ? ' text-white nav-link-active' : ' text-white text-opacity-50'}`
        } style={{ fontSize: 13, borderBottom: '2px solid transparent' }}>
          <i className="bi bi-box-arrow-in-right" style={{ fontSize: 14 }}></i> Entrar
        </NavLink>

        <NavDropdown label="Cadastros" icon="bi-grid"
          items={CADASTROS_ITEMS}
          groupPaths={['/doadores', '/hospitais', '/recepcionistas', '/tipos-sanguineos', '/cidades', '/unidades-coleta']} />

        <NavDropdown label="Processos" icon="bi-arrow-repeat"
          items={PROCESSOS_ITEMS}
          groupPaths={['/doacoes', '/solicitacoes', '/campanhas']} />

        <NavDropdown label="Relatórios" icon="bi-bar-chart-fill"
          items={RELATORIOS_ITEMS}
          groupPaths={['/relatorios']} />

        <a href="#" className="text-decoration-none text-white text-opacity-50 fw-medium d-flex align-items-center gap-1 px-2 mx-1 h-100"
          style={{ fontSize: 13, borderBottom: '2px solid transparent' }}>
          <i className="bi bi-gear" style={{ fontSize: 14 }}></i> Configurações
        </a>
      </nav>

      <div className="d-flex align-items-center gap-2 ms-auto px-3 flex-shrink-0">
        <div className="d-none d-lg-flex flex-column align-items-end text-white">
          <span className="fw-semibold" style={{ fontSize: 12, lineHeight: 1.2 }}>{user || 'Admin'}</span>
          <span className="text-white text-opacity-50" style={{ fontSize: 10 }}>Administrador</span>
        </div>
        <div className="bg-danger rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
          style={{ width: 30, height: 30, fontSize: 11 }}>{initials}</div>
      </div>
    </header>
  );
}
