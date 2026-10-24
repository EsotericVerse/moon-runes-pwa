'use client';

import {useCallback} from 'react';
import {useSearchParams} from 'next/navigation';
import Select from 'react-select';

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

  const options=items.map(item=>({
    value:item.value,label:item.label,description:item.description||''
  }));
  return <section className="management-section-nav" aria-labelledby={headingId}>
    <h2 className="management-section-nav__title" id={headingId}>{title}</h2>
    <label className="management-section-nav__select-label" htmlFor={id+'-select'}>管理功能</label>
    <Select
      inputId={id+'-select'}
      instanceId={id+'-select'}
      unstyled
      className="loc-settings-select"
      classNamePrefix="loc-settings-select"
      isClearable={false}
      isSearchable={items.length>8}
      options={options}
      value={options.find(item=>item.value===activeItem?.value)||options[0]||null}
      onChange={item=>{if(item&&item.value!==activeItem?.value)onChange(item.value);}}
      aria-label={title}
      noOptionsMessage={()=>'沒有管理功能'}
    />
    <span className="management-section-nav__description" id={id+'-option-'+activeItem?.value}>
      {activeItem?.description||activeItem?.label}
    </span>
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
