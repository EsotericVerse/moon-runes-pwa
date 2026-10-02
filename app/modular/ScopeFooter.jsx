'use client';

import ThemeSelect from './ThemeSelect';
import {UI_COPY} from '../i18n/ui-copy';
import {useScopeRuntime} from './use-scope-runtime';

export default function ScopeFooter(){
  const {scopeId}=useScopeRuntime();
  return <footer className="scope-footer" data-scope={scopeId}>
    <div className="scope-footer-row">
      <a href="mailto:sopa2306@gmail.com">{UI_COPY.nav.contact}</a>
      <ThemeSelect scopeId={scopeId}/>
    </div>
  </footer>;
}
