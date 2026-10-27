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
    {scopeId!=='loc'?<details className="scope-card loc-place-disclosure" open={timelineOpen}
      onToggle={event=>setTimelineOpen(event.currentTarget.open)}>
      <summary>
        <span className="loc-place-disclosure-title"><strong>地點整理</strong>
          <small>Google Timeline JSON 匯入／糾紛點</small>
        </span>
        <span className="loc-place-disclosure-indicator" aria-hidden="true">{timelineOpen?'－ 收合':'＋ 展開'}</span>
      </summary>
      {timelineOpen?<div className="loc-place-disclosure-body"><TimelinePlaceManager scopeId={scopeId}/></div>:null}
    </details>:null}
    <TraceManagement scopeId={scopeId} mode="cleanup"/>
    <details className="scope-card loc-place-disclosure" open={editing}
      onToggle={event=>setEditing(event.currentTarget.open)}>
      <summary>
        <span className="loc-place-disclosure-title"><strong>編輯既有地點</strong>
          <small>補充縣市、地址與內容</small>
        </span>
        <span className="loc-place-disclosure-indicator" aria-hidden="true">{editing?'－ 收合':'＋ 展開'}</span>
      </summary>
      {editing?<div className="loc-place-disclosure-body"><TraceManagement scopeId={scopeId} mode="anchor"/></div>:null}
    </details>
    {scopeId!=='loc'?<details className="scope-card loc-place-disclosure" open={quickFill}
      onToggle={event=>setQuickFill(event.currentTarget.open)}>
      <summary>
        <span className="loc-place-disclosure-title"><strong>快速補打卡</strong>
          <small>僅限原本沒有填寫的地點</small>
        </span>
        <span className="loc-place-disclosure-indicator" aria-hidden="true">{quickFill?'－ 收合':'＋ 展開'}</span>
      </summary>
      {quickFill?<div className="loc-place-disclosure-body">
        <p className="scope-status">這是明確手動操作，不會覆寫原有 Facebook 打卡名稱；不會用地址或 GPS 推斷地點身份。</p>
        <PlaceBatchFill scopeId={scopeId}/>
      </div>:null}
    </details>:null}
  </section>;
}
