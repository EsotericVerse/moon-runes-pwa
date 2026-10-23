'use client';

import {useCallback} from 'react';
import {useSearchParams} from 'next/navigation';

/** Visible in-page navigation for management workspaces. */
export default function ManagementSectionNav({
  id,
  title,
  panelId,
  items,
  value,
  onChange
}){
  const activeItem=items.find(item=>item.value===value)||items[0];
  const headingId=id+'-heading';

  return <section className="management-section-nav" aria-labelledby={headingId}>
    <h2 className="management-section-nav__title" id={headingId}>{title}</h2>
    <div className="management-section-nav__items" role="group" aria-label={title}>
      {items.map(item=>{
        const selected=item.value===activeItem?.value;
        const itemId=id+'-option-'+item.value;
        return <button
          key={item.value}
          id={itemId}
          type="button"
          className="management-section-nav__item"
          aria-pressed={selected}
          aria-controls={panelId}
          onClick={()=>onChange(item.value)}
        >
          <span className="management-section-nav__label">{item.label}</span>
          {item.description?<span className="management-section-nav__description">{item.description}</span>:null}
        </button>;
      })}
    </div>
  </section>;
}

// Shared URL state for Admin, Scope management, article management and Settings.
// Native History API updates Next.js useSearchParams without a route remount,
// retaining edit=1, scopeid, and any other existing query parameters.
export function useManagementSection(items,defaultValue='',aliases={}){
  const searchParams=useSearchParams();
  const requested=searchParams?.get('section')||'';
  const normalized=aliases[requested]||requested;
  const fallback=items.some(item=>item.value===defaultValue)?defaultValue:items[0]?.value||'';
  const value=items.some(item=>item.value===normalized)?normalized:fallback;
  const setValue=useCallback(next=>{
    if(!items.some(item=>item.value===next))return;
    const url=new URL(window.location.href);
    if(url.searchParams.get('section')===next)return;
    url.searchParams.set('section',next);
    window.history.pushState(null,'',url.pathname+url.search+url.hash);
  },[items]);
  const hrefFor=useCallback(next=>{
    if(!items.some(item=>item.value===next))return '';
    const url=new URL(window.location.href);
    url.searchParams.set('section',next);
    return url.pathname+url.search+url.hash;
  },[items]);
  return [value,setValue,hrefFor];
}
