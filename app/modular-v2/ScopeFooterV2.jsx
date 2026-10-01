'use client';

import ThemeSelectV2 from './ThemeSelectV2';
import {UI_COPY} from '../i18n/ui-copy';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

export default function ScopeFooterV2(){
  const {scopeId}=useScopeRuntimeV2();
  return <footer className="scope-v2-footer" data-scope={scopeId}>
    <div className="scope-v2-footer-row">
      <a href="mailto:sopa2306@gmail.com">{UI_COPY.nav.contact}</a>
      <ThemeSelectV2 scopeId={scopeId}/>
    </div>
  </footer>;
}
