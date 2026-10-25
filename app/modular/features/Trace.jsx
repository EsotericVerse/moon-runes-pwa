'use client';

import dynamic from 'next/dynamic';
import {useRouter} from 'next/navigation';
import {FeaturePage} from '../ui';
import {featureNavigationHref} from '../feature-navigation';
import {useAsyncResource} from '../../loc/use-async-resource';
import {TRACE_SCOPES,traceKey,readTraceData} from './trace/trace-data';

// Preserve the Trace Hero. Load saved anchors independently of the map engine;
// this does not fetch article bodies or instantiate a second search system.
const TraceMap=dynamic(()=>import('./trace/TraceMap'),{
  ssr:false,
  loading:()=> <p className="scope-status" role="status">正在載入痕跡地圖…</p>
});

export default function Trace({scopeId='loc'}){
  const router=useRouter();
  const supported=TRACE_SCOPES.includes(scopeId);
  const traces=useAsyncResource(traceKey(scopeId),()=>readTraceData(scopeId),{
    enabled:supported,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  return <FeaturePage featureId="trace">
    <TraceMap spatialData={traces.data||null} onAnchorSelect={anchor=>{
      const place=String(anchor?.title||'').trim();
      if(place)router.push(featureNavigationHref('loc','search',{place}));
    }}/>
    {supported&&traces.isPending?<p className="scope-status" role="status">正在載入已建立的空間定錨點…</p>:null}
    {supported&&traces.error?<p className="scope-status scope-error" role="alert">空間定錨點讀取失敗：{String(traces.error.message||traces.error)}</p>:null}
  </FeaturePage>;
}
