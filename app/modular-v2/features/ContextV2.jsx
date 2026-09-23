'use client';

import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import ContextWorkbenchV2 from './ContextWorkbenchV2';

export default function ContextV2(){
  const {scopeId}=useScopeRuntimeV2();
  return <section className="loc-view">
    <h1>脈絡</h1>
    <ContextWorkbenchV2 scopeId={scopeId}/>
  </section>;
}
