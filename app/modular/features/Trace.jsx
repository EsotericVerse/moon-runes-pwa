'use client';

import dynamic from 'next/dynamic';
import {useRouter} from 'next/navigation';
import {FeaturePage} from '../ui';
import {featureNavigationHref} from '../feature-navigation';
import {useAsyncResource} from '../../loc/use-async-resource';
import {traceKey,readTraceData} from './trace/trace-data';

// Preserve the Trace Hero. Load saved anchors independently of the map engine;
// this does not fetch article bodies or instantiate a second search system.
const TraceMap=dynamic(()=>import('./trace/TraceMap'),{
  ssr:false,
  loading:()=> <p className="scope-status" role="status">正在載入痕跡地圖…</p>
});

export default function Trace({scopeId='loc'}){
  const router=useRouter();
  const traces=useAsyncResource(traceKey(scopeId),()=>readTraceData(scopeId),{
    revalidateOnFocus:false,revalidateOnReconnect:false
  });
  return <FeaturePage featureId="trace">
    <TraceMap spatialData={traces.data||null} onAnchorSelect={anchor=>{
      const place=String(anchor?.title||'').trim();
      if(place)router.push(featureNavigationHref('loc','search',{place}));
    }}/>
    {traces.isPending?<p className="scope-status" role="status">正在載入已建立的空間定錨點…</p>:null}
    {traces.error?<p className="scope-status scope-error" role="alert">空間定錨點讀取失敗：{String(traces.error.message||traces.error)}</p>:null}
  </FeaturePage>;
}
