'use client';

import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeFeatureSubtitleV2} from '../page-profiles.v2';
import ContextWorkbenchV2 from './ContextWorkbenchV2';

export default function ContextV2(){
  const {scopeId}=useScopeRuntimeV2();
  return <section className="loc-view">
    <h1>脈絡</h1>
    <p className="loc-subtitle">{scopeFeatureSubtitleV2(scopeId,'context')}</p>
    <ContextWorkbenchV2 scopeId={scopeId}/>
  </section>;
}
