'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import PanelLoading from './PanelLoading';

const TraceManagement=dynamic(()=>import('./TraceManagement'),{loading:PanelLoading});
const PlaceBatchFill=dynamic(()=>import('./PlaceBatchFill'),{loading:PanelLoading});
const TimelinePlaceManager=dynamic(()=>import('./TimelinePlaceManager'),{loading:PanelLoading});

export default function PlaceManagement({scopeId}){
  const [editing,setEditing]=useState(false);
  const [quickFill,setQuickFill]=useState(false);
  const [timelineOpen,setTimelineOpen]=useState(false);
  return <section aria-label="地點管理">
    {scopeId!=='loc'?<details className="scope-card" open={timelineOpen}
      onToggle={event=>setTimelineOpen(event.currentTarget.open)}>
      <summary>地點整理 · Google Timeline JSON 匯入／糾紛點</summary>
      {timelineOpen?<TimelinePlaceManager scopeId={scopeId}/>:null}
    </details>:null}
    <TraceManagement scopeId={scopeId} mode="cleanup"/>
    <details className="scope-card" open={editing}
      onToggle={event=>setEditing(event.currentTarget.open)}>
      <summary>編輯既有地點／補充縣市、地址與內容</summary>
      {editing?<TraceManagement scopeId={scopeId} mode="anchor"/>:null}
    </details>
    {scopeId!=='loc'?<details className="scope-card" open={quickFill}
      onToggle={event=>setQuickFill(event.currentTarget.open)}>
      <summary>快速補打卡（僅限原本沒有填寫的地點）</summary>
      <p className="scope-status">這是明確手動操作，不會覆寫原有 Facebook 打卡名稱；不會用地址或 GPS 推斷地點身份。</p>
      {quickFill?<PlaceBatchFill scopeId={scopeId}/>:null}
    </details>:null}
  </section>;
}
