'use client';

import Link from 'next/link';

// Single shared decision: does this href stay on the current page's origin?
// Relative paths always do. An absolute URL only does when its origin matches
// the browser's current origin — comparing hostnames (not scopeId-by-scopeId)
// means this works for every caller, including hand-written absolute links,
// without re-deriving Scope Domain/Directory rules in each file.
export function isSameOriginHref(href=''){
  const value=String(href||'');
  if(!/^https?:\/\//i.test(value))return true;
  if(typeof window==='undefined')return false;
  try{
    return new URL(value,window.location.href).origin===window.location.origin;
  }catch{
    return false;
  }
}

// Same-origin navigation goes through Next.js's router (next/link) so the
// mounted React tree, its QueryClient and every React Query cache survive the
// click. A different origin, or the native Capacitor shell's bundled file
// paths, cannot use client-side routing at all and keep the plain <a> full
// navigation.
export default function ScopeLink({href,native=false,children,...rest}){
  if(native||!isSameOriginHref(href))return <a href={href} {...rest}>{children}</a>;
  return <Link href={href} {...rest}>{children}</Link>;
}
