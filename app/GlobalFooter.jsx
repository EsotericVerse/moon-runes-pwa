'use client';

import { useEffect,useState } from 'react';
import { usePathname } from 'next/navigation';
import ThemeSelect from './ThemeSelect';
import { detectNavScope } from './nav-route-map';

const ROOTS={
  loc:{label:'月典',href:'https://loc.lo3rwang.cc/'},
  runes:{label:'月之符文',href:'https://lrunes.lo3rwang.cc/'},
  lo3rwang:{label:'lo3rwang',href:'https://lo3rwang.lo3rwang.cc/'},
  governance:{label:'治理管理',href:'https://admin.lo3rwang.cc/'}
};

export default function GlobalFooter(){
  const pathname=usePathname()||'/';
  const [host,setHost]=useState('');
  useEffect(()=>setHost(window.location.hostname),[]);
  const scope=detectNavScope(pathname,host);
  const root=ROOTS[scope]||ROOTS.loc;

  return <footer className="loc-site-footer">
    <div className="loc-site-footer-row loc-site-footer-row-primary">
      <a href={root.href}>{root.label}</a>｜<ThemeSelect />
    </div>
    <div className="loc-site-footer-row"><a href="https://lo3rwang.lo3rwang.cc/">Lucas Oscar Wang 政德</a>｜<a href="mailto:sopa2306@gmail.com">聯絡方式</a></div>
  </footer>;
}
