'use client';

import dynamic from 'next/dynamic';
import PanelLoading from './PanelLoading';
import TimelinePlaceManager from './TimelinePlaceManager';

const TraceManagement=dynamic(()=>import('./TraceManagement'),{loading:PanelLoading});
const PlaceBatchFill=dynamic(()=>import('./PlaceBatchFill'),{loading:PanelLoading});

export default function PlaceManagement({scopeId,section='anchor'}){
  return <section className="loc-place-workspace" aria-label="空間定錨管理">
    <div className="loc-place-workspace__panel">
      {section==='anchor'?<TraceManagement scopeId={scopeId} mode="anchor"/>:null}
      {section==='names'?<TraceManagement scopeId={scopeId} mode="cleanup"/>:null}
      {section==='timeline'?<TimelinePlaceManager scopeId={scopeId}/>:null}
      {section==='quickFill'?<PlaceBatchFill scopeId={scopeId}/>:null}
    </div>
  </section>;
}
