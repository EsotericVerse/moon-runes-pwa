'use client';

import dynamic from 'next/dynamic';
import {FeaturePage} from '../ui';

// Keep the existing Trace Hero configuration. Search owns the separate
// explanatory Blocks; Trace loads the map without fetching those Blocks.
const TraceMap=dynamic(()=>import('./trace/TraceMap'),{
  ssr:false,
  loading:()=> <p className="scope-status" role="status">正在載入痕跡地圖…</p>
});

export default function Trace(){
  return <FeaturePage featureId="trace">
    <TraceMap/>
  </FeaturePage>;
}
