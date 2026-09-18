'use client';

import {useEffect,useState} from 'react';
import {getScopeContact} from '../loc/scope-public-settings';
import ThemeSelectV2 from './ThemeSelectV2';
import {scopeOriginV2} from './scope-registry.v2';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

export default function ScopeFooterV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const [contact,setContact]=useState(null);

  useEffect(()=>{
    let live=true;
    getScopeContact(scopeId)
      .then(value=>live&&setContact(value))
      .catch(()=>live&&setContact(null));
    return()=>{live=false};
  },[scopeId]);

  return <footer className="scope-v2-footer">
    <div className="scope-v2-footer-row">
      <a href={scopeOriginV2(scopeId)}>{scope.label}</a>
      <span aria-hidden="true">｜</span>
      <ThemeSelectV2/>
    </div>
    {contact?.contact_email?<div className="scope-v2-footer-row">
      <a href={`mailto:${contact.contact_email}`}>{contact.contact_label||'聯絡管理者'}</a>
    </div>:null}
  </footer>;
}
