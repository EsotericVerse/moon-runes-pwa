'use client';

import { useEffect,useState } from 'react';
import { usePathname } from 'next/navigation';

const SHARED=[['脈絡','context'],['統計','statics'],['文化','evolution'],['治理','governance']];

function detectScope(pathname,host){
  if(host==='lrunes.lo3rwang.cc'||pathname==='/runes'||pathname.startsWith('/runes/'))return 'runes';
  if(host==='whoami.lo3rwang.cc')return 'author';
  if(host==='manage.lo3rwang.cc'||pathname==='/management'||pathname.startsWith('/management/'))return 'governance';
  return 'loc';
}
function scopeBase(scope,host){if(scope==='runes')return host==='lrunes.lo3rwang.cc'?'':'/runes';return '';}
function config(scope,host){
  const base=scopeBase(scope,host);
  if(scope==='runes')return {reserved:['語彙',base||'/'],role:[['作者頁面','https://whoami.lo3rwang.cc']],homes:[['回月之符文首頁',base||'/'],['回月典首頁','https://loc.lo3rwang.cc']],base};
  if(scope==='author')return {reserved:['風格詞','/'],role:[['管理者頁面','https://manage.lo3rwang.cc']],homes:[['回作者頁面','/'],['回月典首頁','https://loc.lo3rwang.cc']],base};
  if(scope==='governance')return {reserved:['治理規則','/'],role:[['管理者頁面','https://manage.lo3rwang.cc']],homes:[['回治理頁面','/'],['回月典首頁','https://loc.lo3rwang.cc']],base};
  return {reserved:['月之符文','/runes'],role:[['作者頁面','https://whoami.lo3rwang.cc']],homes:[['回月典首頁','/']],base};
}

export default function ScopeNav(){
  const pathname=usePathname()||'/';
  const [host,setHost]=useState('');
  useEffect(()=>setHost(window.location.hostname),[]);
  const scope=detectScope(pathname,host);
  const cfg=config(scope,host);
  const route=name=>`${cfg.base}/${name}`.replace('//','/');
  return <>
    <a href={cfg.reserved[1]}>{cfg.reserved[0]}</a>
    {SHARED.map(([label,name])=><a key={name} href={route(name)}>{label}</a>)}
    <form className="loc-next-search" action={route('search')} method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋"/><button type="submit">搜尋</button></form>
    {cfg.role.map(([label,href])=><a key={label} href={href}>{label}</a>)}
    {cfg.homes.map(([label,href])=><a key={label} className="loc-next-home" href={href}>{label}</a>)}
  </>;
}
