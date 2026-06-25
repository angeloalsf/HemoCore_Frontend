import React from 'react';
import Header from './Header';
import Drawer from './Drawer';

export default function PageLayout({ title, subtitle, action, children }) {
  return (
    <>
      <Drawer />
      <Header />
      <div className="d-flex flex-column" style={{ minHeight: '100vh', paddingTop: 58 }}>
        <div className="bg-white border-bottom d-flex align-items-center justify-content-between px-3 px-lg-4 page-topbar"
          style={{ gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="fw-bold text-dark text-truncate" style={{ fontSize: 15 }}>{title}</div>
            {subtitle && (
              <div className="text-secondary d-none d-sm-block text-truncate" style={{ fontSize: 12 }}>{subtitle}</div>
            )}
          </div>
          {action && (
            <div className="d-flex align-items-center gap-2 flex-shrink-0">{action}</div>
          )}
        </div>
        <main className="flex-grow-1 p-3 p-sm-4">
          {children}
        </main>
      </div>
    </>
  );
}
