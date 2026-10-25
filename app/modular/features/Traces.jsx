'use client';

import dynamic from 'next/dynamic';
import {FeaturePage} from '../ui';

// The existing /governance URL and governance Hero asset contract remain
// unchanged until public route migration is explicitly requested. The actual
// Governance text Blocks remain owned by GovernanceLegal and Search's tab.
const TracesMap=dynamic(()=>import('./traces/TracesMap'),{
  ssr:false,
  loading:()=> <p className="scope-status" role="status">正在載入痕跡地圖…</p>
});

export default function Traces(){
  return <FeaturePage featureId="governance">
    <TracesMap/>
  </FeaturePage>;
}
