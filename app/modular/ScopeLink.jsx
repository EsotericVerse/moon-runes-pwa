'use client';

import Link from 'next/link';

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

export default function ScopeLink({href,native=false,children,...rest}){
  if(native||!isSameOriginHref(href))return <a href={href} {...rest}>{children}</a>;
  return <Link href={href} {...rest}>{children}</Link>;
}
