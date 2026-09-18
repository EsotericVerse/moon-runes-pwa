'use client';

import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import ThemeSelect from './ThemeSelect';
import {detectNavScope} from './nav-route-map';
import {getScopeContact} from './loc/scope-public-settings';

const ROOTS={
  loc:{label:'月典',href:'https://loc.lo3rwang.cc/'},
  runes:{label:'月之符文',href:'https://lrunes.lo3rwang.cc/'},
  lo3rwang:{label:'lo3rwang',href:'https://lo3rwang.lo3rwang.cc/'},
  governance:{label:'治理管理',href:'https://admin.lo3rwang.cc/'}
};

export default function GlobalFooter(){
  const pathname=usePathname()||'/';
  const [host,setHost]=useState('');
  const [contact,setContact]=useState(null);

  useEffect(()=>setHost(window.location.hostname),[]);
  const scope=detectNavScope(pathname,host);
  const root=ROOTS[scope]||ROOTS.loc;

  useEffect(()=>{
    let live=true;
    getScopeContact(scope).then(value=>{if(live)setContact(value)}).catch(()=>{if(live)setContact(null)});
    return()=>{live=false};
  },[scope]);

  return <footer className="loc-site-footer">
    <div className="loc-site-footer-row loc-site-footer-row-primary">
      <a href={root.href}>{root.label}</a>
      <span aria-hidden="true">｜</span>
      <ThemeSelect/>
    </div>
    {contact?.contact_email?<div className="loc-site-footer-row">
      <a href={`mailto:${contact.contact_email}`}>{contact.contact_label||'聯絡管理者'}</a>
    </div>:null}
  </footer>;
}
