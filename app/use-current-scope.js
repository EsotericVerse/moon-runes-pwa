'use client';

import {getSiteScope} from './site-registry';
import {useScopeRuntimeV2} from './modular-v2/use-scope-runtime.v2';

export function useCurrentScope(){
  const {scopeId,host,pathname}=useScopeRuntimeV2();
  return {scope:scopeId,current:getSiteScope(scopeId),pathname,host};
}
