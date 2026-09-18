'use client';

import ThemeSelectV2 from './ThemeSelectV2';
import {scopeOriginV2} from './scope-registry.v2';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

export default function ScopeFooterV2({contact=null}){
  const {scopeId,scope}=useScopeRuntimeV2();
  return <footer className="scope-v2-footer">
    <div className="scope-v2-footer-row">
      <a href={scopeOriginV2(scopeId)}>{scope.label}</a>
      <span aria-hidden="true">｜</span>
      <ThemeSelectV2/>
    </div>
    {contact?.email?<div className="scope-v2-footer-row"><a href={`mailto:${contact.email}`}>{contact.label||'聯絡管理者'}</a></div>:null}
  </footer>;
}
