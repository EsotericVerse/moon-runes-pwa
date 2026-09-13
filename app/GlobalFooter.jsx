'use client';

import { usePathname } from 'next/navigation';
import ThemeSelect from './ThemeSelect';

export default function GlobalFooter(){
  const pathname=usePathname()||'/';
  const isRunes=pathname==='/runes'||pathname.startsWith('/runes/');

  return <footer className="loc-site-footer">
    <div><a href={isRunes?'/runes':'/'}>{isRunes?'月之符文':'月典'}</a>｜<a href="/governance">治理</a></div>
    <div><ThemeSelect /></div>
    <div>作者：<a href="https://whoami.lo3rwang.cc/">lo3rwang（Lucas Oscar Wang 政德）</a>｜秘藝文域（EsotericVerse）（籌備中）</div>
  </footer>;
}
