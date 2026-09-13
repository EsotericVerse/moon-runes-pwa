'use client';

import { usePathname } from 'next/navigation';
import ThemeSelect from './ThemeSelect';

export default function GlobalFooter(){
  const pathname=usePathname()||'/';
  const isRunes=pathname==='/runes'||pathname.startsWith('/runes/');

  return <footer className="loc-site-footer">
    <div className="loc-site-footer-row loc-site-footer-row-primary">
      <div><a href={isRunes?'/runes':'/'}>{isRunes?'月之符文':'月典'}</a>｜<a href="/governance">治理</a></div>
      <ThemeSelect />
    </div>
    <div className="loc-site-footer-row"><a href="https://whoami.lo3rwang.cc/">Lucas Oscar Wang 政德</a>｜聯絡方式：sopa2306@gmail.com｜秘藝文域（EsotericVerse）（籌備中）</div>
  </footer>;
}
