import React from 'react';

export function TableCard({ title, count, filters, children, footer }) {
  return (
    <div className="card border border-light-subtle rounded-4 overflow-hidden" style={{ background: '#fff' }}>
      <div className="card-header bg-white border-bottom border-light-subtle p-3 p-sm-4 d-flex flex-column gap-3">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <div style={{ minWidth: 0 }}>
            <h5 className="fw-bold mb-0" style={{ fontSize: 14 }}>{title}</h5>
            <p className="text-secondary mt-1 mb-0" style={{ fontSize: 11.5 }}>
              {count} registro{count !== 1 ? 's' : ''} encontrado{count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {filters && <div className="d-flex flex-wrap gap-2">{filters}</div>}
      </div>
      {children}
      {footer && (
        <div className="card-footer bg-white border-top border-light-subtle p-3 d-flex align-items-center justify-content-between flex-wrap gap-2 text-secondary" style={{ fontSize: 12 }}>
          {footer}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="text-center text-secondary py-5 px-3" style={{ fontSize: 13.5 }}>
      <i className="bi bi-inbox d-block mb-2 opacity-50" style={{ fontSize: 30 }}></i>
      {message}
    </div>
  );
}

export function ActionBtn({ icon, color, onClick, title, modalTarget }) {
  return (
    <button
      className="btn btn-light btn-sm d-inline-flex align-items-center justify-content-center p-0 border action-btn"
      style={{ color }}
      onClick={onClick}
      data-bs-toggle={modalTarget ? 'modal' : undefined}
      data-bs-target={modalTarget}
      title={title}
    >
      <i className={`bi ${icon}`} style={{ fontSize: 13 }}></i>
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="position-relative flex-grow-1" style={{ minWidth: 140 }}>
      <i className="bi bi-search position-absolute text-secondary" style={{ left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13 }}></i>
      <input type="text" className="form-control focus-ring-danger" placeholder={placeholder}
        value={value} onChange={(e) => onChange(e.target.value)}
        style={{ padding: '7px 10px 7px 30px', borderRadius: 8, fontSize: 13, height: 36, borderColor: '#E2E8F0' }} />
    </div>
  );
}

export function FilterSelect({ value, onChange, options, style, disabled = false }) {
  return (
    <select className="form-select flex-shrink-0 w-auto" value={value} onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{ borderRadius: 8, fontSize: 12.5, height: 36, borderColor: '#E2E8F0', ...style }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function DateInput({ value, onChange, label, min, max, disabled = false, style }) {
  return (
    <div className="d-inline-flex align-items-center gap-2 flex-shrink-0">
      {label && <span className="text-secondary fw-semibold" style={{ fontSize: 12 }}>{label}</span>}
      <input type="date" className="form-select flex-shrink-0 w-auto" value={value}
        onChange={(e) => onChange(e.target.value)} disabled={disabled} min={min} max={max}
        style={{ borderRadius: 8, fontSize: 12.5, height: 36, borderColor: '#E2E8F0', ...style }} />
    </div>
  );
}

export function Pagination({ current, total, onPrev, onNext }) {
  return (
    <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
      <span>Exibindo 1–{total} de {total} registros</span>
      <div className="d-flex gap-1">
        <button className="btn btn-outline-secondary btn-sm p-0 d-flex align-items-center justify-content-center"
          style={{ width: 30, height: 30, borderRadius: 7, borderColor: '#E2E8F0', background: '#fff', color: '#718096' }}
          onClick={onPrev}>
          <i className="bi bi-chevron-left"></i>
        </button>
        <button className="btn btn-danger btn-sm p-0 d-flex align-items-center justify-content-center fw-bold text-white border-0"
          style={{ width: 30, height: 30, borderRadius: 7 }}>
          {current}
        </button>
        <button className="btn btn-outline-secondary btn-sm p-0 d-flex align-items-center justify-content-center"
          style={{ width: 30, height: 30, borderRadius: 7, borderColor: '#E2E8F0', background: '#fff', color: '#718096' }}
          onClick={onNext}>
          <i className="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}
