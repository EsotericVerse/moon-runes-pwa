'use client';

import {useCallback,useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';

/**
 * In-page management navigator.
 * In-page horizontal tabs are React selection UI, NOT a Next.js route transition.
 */
export default function ManagementSectionNav({id,title,panelId,items,value,onChange,showDescriptions=false}){
  const activeItem=items.find(item=>item.value===value)||items[0];
  const headingId=id+'-heading';
  return <section className="management-section-nav" aria-labelledby={headingId}>
    <h2 className="management-section-nav__title" id={headingId}>{title}</h2>
    <div className="management-section-nav__items" role="group" aria-label={title}>
      {items.map(item=>{
        const selected=item.value===activeItem?.value;
        return <button
          key={item.value}
          id={id+'-option-'+item.value}
          type="button"
          className="management-section-nav__item"
          aria-label={item.shortLabel&&item.shortLabel!==item.label?item.label:undefined}
          aria-pressed={selected}
          aria-controls={panelId}
          onClick={()=>{if(!selected)onChange(item.value);}}
        >
          <span className="management-section-nav__label">{item.shortLabel||item.label}</span>
          {showDescriptions&&item.description?<span className="management-section-nav__description">{item.description}</span>:null}
        </button>;
      })}
    </div>
  </section>;
}

// The component's React state is the source of truth, so section clicks do
// not navigate or remount the page (and therefore do not jump to the Hero).
// The History API only mirrors selection for deep links/back-forward support.
export function useManagementSection(items,defaultValue='',aliases={}){
  const searchParams=useSearchParams();
  const resolve=raw=>{
    const requested=aliases[raw]||raw;
    const fallback=items.some(item=>item.value===defaultValue)?defaultValue:items[0]?.value||'';
    return items.some(item=>item.value===requested)?requested:fallback;
  };
  const [value,setLocalValue]=useState(()=>resolve(searchParams?.get('section')||''));
  useEffect(()=>{
    const sync=()=>setLocalValue(resolve(new URL(window.location.href).searchParams.get('section')||''));
    window.addEventListener('popstate',sync);
    return ()=>window.removeEventListener('popstate',sync);
  });
  const setValue=useCallback(next=>{
    if(!items.some(item=>item.value===next))return;
    // Update the UI immediately; no router.push/replace, no scroll reset.
    setLocalValue(next);
    const url=new URL(window.location.href);
    if(url.searchParams.get('section')!==next){
      url.searchParams.set('section',next);
      window.history.pushState(window.history.state,'',url.pathname+url.search+url.hash);
    }
  },[items]);
  const hrefFor=useCallback(next=>{
    if(!items.some(item=>item.value===next))return '';
    const url=new URL(window.location.href);
    url.searchParams.set('section',next);
    return url.pathname+url.search+url.hash;
  },[items]);
  return [value,setValue,hrefFor];
}
