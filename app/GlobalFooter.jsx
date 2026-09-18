'use client';

import {useEffect,useState} from 'react';
import ThemeSelect from './ThemeSelect';
import {useSiteScope} from './SiteScopeProvider';
import {getScopeContact} from './loc/scope-public-settings';

export default function GlobalFooter(){
  const {scope,current,ready}=useSiteScope();
  const [contact,setContact]=useState(null);

  useEffect(()=>{
    let live=true;
    if(!ready){setContact(null);return()=>{live=false};}
    getScopeContact(scope==='governance'?'admin':scope)
      .then(value=>{if(live)setContact(value)})
      .catch(()=>{if(live)setContact(null)});
    return()=>{live=false};
  },[scope,ready]);

  if(!ready)return null;

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
