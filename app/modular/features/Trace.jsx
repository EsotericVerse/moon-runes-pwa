'use client';

import dynamic from 'next/dynamic';
import {FeaturePage} from '../ui';

// The /trace URL is canonical; the original Hero image remains unchanged. The actual
// Governance text Blocks remain owned by GovernanceLegal and Search's tab.
const TraceMap=dynamic(()=>import('./trace/TraceMap'),{
  ssr:false,
  loading:()=> <p className="scope-status" role="status">正在載入痕跡地圖…</p>
});

export default function Trace(){
  return <FeaturePage featureId="trace">
    <TraceMap/>
  </FeaturePage>;
}
