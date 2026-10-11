'use client';

// Compatibility landing for saved governance management URLs.
// The editable management panels now live under /settings/.
import {useEffect} from 'react';
import {useScopeRuntime} from '../modular/use-scope-runtime';

export default function GovernanceManagement(){
  const {scopeId}=useScopeRuntime();
  const target='/settings/?section=manage'+(scopeId?'&scope='+encodeURIComponent(scopeId):'');
  useEffect(()=>{window.location.replace(target);},[target]);
  return <section className="loc-card">
    <h2>管理功能已移至設定</h2>
    <p>原有管理權限不變。</p>
    <a className="loc-button primary" href={target}>前往設定／管理功能</a>
  </section>;
}
