'use client';

import {SHARED_FEATURES} from './site-registry';
import {useSiteScope} from './SiteScopeProvider';

export default function ScopeNav(){
  const {current,route,ready}=useSiteScope();

  function submitSearch(event){
    event.preventDefault();
    const value=String(new FormData(event.currentTarget).get('q')||'').trim();
    if(!value)return;
    window.sessionStorage.setItem('loc-pending-search',value);
    window.location.assign(route('search'));
  }

  if(!ready)return null;

  return <>
    <a href={current.reserved[1]}>{current.reserved[0]}</a>
    {SHARED_FEATURES.map(feature=><a key={feature.id} href={route(feature.path)}>{feature.label}</a>)}
    <form className="loc-next-search" onSubmit={submitSearch} role="search">
      <input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋"/>
      <button type="submit">搜尋</button>
    </form>
    {current.role.map(([label,href])=><a key={label} href={href}>{label}</a>)}
    {current.homes.map(([label,href])=><a key={label} className="loc-next-home" href={href}>{label}</a>)}
  </>;
}
