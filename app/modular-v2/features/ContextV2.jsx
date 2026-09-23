'use client';

import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import ContextWorkbenchV2 from './ContextWorkbenchV2';

export default function ContextV2(){
  const {scopeId}=useScopeRuntimeV2();
  return <ContextWorkbenchV2 scopeId={scopeId}/>;
}
