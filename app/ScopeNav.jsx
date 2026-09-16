'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {detectNavScope,getNavScopeConfig,navRoute,SHARED_NAV_FUNCTIONS} from './nav-route-map';
export default function ScopeNav(){
 const pathname=usePathname()||'/'; const [host,setHost]=useState('');
 useEffect(()=>setHost(window.location.hostname),[]);
 const scope=detectNavScope(pathname,host); const cfg=getNavScopeConfig(scope);
 return <>
  <a href={cfg.reserved[1]}>{cfg.reserved[0]}</a>
  {SHARED_NAV_FUNCTIONS.map(([label,name])=><a key={name} href={navRoute(cfg,name)}>{label}</a>)}
  <form className="loc-next-search" action={navRoute(cfg,'search')} method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋"/><button type="submit">搜尋</button></form>
  {cfg.role.map(([label,href])=><a key={label} href={href}>{label}</a>)}
  {cfg.homes.map(([label,href])=><a key={label} className="loc-next-home" href={href}>{label}</a>)}
 </>;
}
