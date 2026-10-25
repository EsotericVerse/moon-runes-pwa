'use client';

import dynamic from 'next/dynamic';
import {FeaturePage} from '../ui';

// The /trace URL owns this feature. Its original governance Hero asset contract
// remains unchanged until the author updates the stored title. The actual
// Governance text Blocks remain owned by GovernanceLegal and Search's tab.
const TracesMap=dynamic(()=>import('./traces/TracesMap'),{
  ssr:false,
  loading:()=> <p className="scope-status" role="status">正在載入痕跡地圖…</p>
});

export default function Trace(){
  return <FeaturePage featureId="governance">
    <TracesMap/>
  </FeaturePage>;
}
