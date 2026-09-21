'use client';

import FeaturePageV2 from '../FeaturePageV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeDataViewV2} from '../scope-registry.v2';
import ContextWorkbenchV2 from './ContextWorkbenchV2';

export default function ContextV2(){
  const {scopeId}=useScopeRuntimeV2();
  const view=scopeDataViewV2(scopeId,'context');
  return <FeaturePageV2 featureId="context" subtitle="人事物的分析關聯表達">
    <ContextWorkbenchV2 scopeId={scopeId} view={view}/>
  </FeaturePageV2>;
}
