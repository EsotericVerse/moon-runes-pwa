'use client';

import ScopeNav from './ScopeNav';

export default function GlobalNav(){
  return <header className="loc-next-header loc-global-header">
    <div className="loc-next-nav-stack">
      <nav className="loc-next-nav loc-next-nav-primary" aria-label="主要導覽">
        <ScopeNav />
      </nav>
    </div>
  </header>;
}
