'use client';

import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import ThemeSelect from './ThemeSelect';
import {detectSiteScope,getSiteScope} from './site-registry';
import {getScopeContact} from './loc/scope-public-settings';

export default function GlobalFooter(){
  const pathname=usePathname()||'/';
  const [host,setHost]=useState('');
  const [contact,setContact]=useState(null);

  useEffect(()=>setHost(window.location.hostname),[]);
  const scope=detectSiteScope(pathname,host);
  const current=getSiteScope(scope);

  useEffect(()=>{
    let live=true;
    getScopeContact(scope==='governance'?'admin':scope).then(value=>{if(live)setContact(value)}).catch(()=>{if(live)setContact(null)});
    return()=>{live=false};
  },[scope]);

  return <footer className="loc-site-footer">
    <div className="loc-site-footer-row loc-site-footer-row-primary">
      <a href={`https://${current.domain}/`}>{current.label}</a>
      <span aria-hidden="true">｜</span>
      <ThemeSelect/>
    </div>
    {contact?.contact_email?<div className="loc-site-footer-row">
      <a href={`mailto:${contact.contact_email}`}>{contact.contact_label||'聯絡管理者'}</a>
    </div>:null}
  </footer>;
}
