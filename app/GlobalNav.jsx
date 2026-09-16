'use client';

import { usePathname } from 'next/navigation';
import ScopeNav from './ScopeNav';
import {useLanguage} from './LanguageProvider';

export default function GlobalNav(){
  const pathname=usePathname()||'/';
  const isRunes=pathname==='/runes'||pathname.startsWith('/runes/');
  const {locale,toggleLocale}=useLanguage();
  return <header className="loc-next-header loc-global-header">
    <div className="loc-next-nav-stack">
      <nav className="loc-next-nav loc-next-nav-primary" aria-label={isRunes?'月之符文主要導覽':'LOC 主要導覽'}>
        <ScopeNav />
        <button type="button" className="loc-language-toggle" onClick={toggleLocale} aria-label={locale==='zh-Hant'?'Switch to English':'切換為中文'}>{locale==='zh-Hant'?'EN':'中'}</button>
      </nav>
    </div>
  </header>;
}
