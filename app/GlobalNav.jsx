'use client';

import { usePathname } from 'next/navigation';
import ScopeNav from './ScopeNav';

export default function GlobalNav(){
  const pathname=usePathname()||'/';
  const isRunes=pathname==='/runes'||pathname.startsWith('/runes/');
  return <header className="loc-next-header loc-global-header">
    <div className="loc-next-nav-stack">
      <nav className="loc-next-nav loc-next-nav-primary" aria-label={isRunes?'月之符文主要導覽':'LOC 主要導覽'}>
        <ScopeNav />
      </nav>
    </div>
  </header>;
}
