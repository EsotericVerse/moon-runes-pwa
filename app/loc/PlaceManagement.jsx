'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import {useEditDock} from '../modular/edit-dock';
import ManagementSectionNav from '../modular/ManagementSectionNav';
import PanelLoading from './PanelLoading';
import {recoverChunkOnce} from './chunk-recovery.mjs';

const TimelinePlaceManager=dynamic(()=>import('./TimelinePlaceManager').catch(recoverChunkOnce),{loading:PanelLoading});

const TraceManagement=dynamic(()=>import('./TraceManagement'),{loading:PanelLoading});
const PlaceBatchFill=dynamic(()=>import('./PlaceBatchFill'),{loading:PanelLoading});

const PLACE_OPTIONS=Object.freeze([
  {value:'anchor',label:'空間定錨點',description:'新增或編輯地點、座標、隱藏權限'},
  {value:'names',label:'名稱整理',description:'同位置名稱校正、別名、熱門地點'},
  {value:'timeline',label:'Timeline 地點整理',description:'匯入路線 JSON、審查糾紛點'},
  {value:'quickFill',label:'快速補打卡',description:'原有 source_place 日期批次補寫'}
]);

export default function PlaceManagement({scopeId}){
  const dock=useEditDock();
  const options=scopeId==='loc'?PLACE_OPTIONS.filter(item=>item.value==='anchor'||item.value==='names'):PLACE_OPTIONS;
  const [section,setSection]=useState(()=>scopeId==='loc'?'names':'anchor');
  const active=options.some(item=>item.value===section)?section:options[0].value;
  const panelId='place-management-panel-'+scopeId;
  const navId='place-management-sections-'+scopeId;
  const changeSection=next=>{
    if(next===active)return;
    if(dock?.active)dock.switchSection(next,setSection);
    else setSection(next);
  };
  return <section className="loc-place-workspace" aria-label="地點管理">
    <ManagementSectionNav id={navId} title="地點操作分類" panelId={panelId}
      items={options} value={active} onChange={changeSection}/>
    <div className="loc-place-workspace__panel" id={panelId} role="region"
      aria-labelledby={navId+'-option-'+active}>
      {active==='anchor'?<TraceManagement scopeId={scopeId} mode="anchor"/>:null}
      {active==='names'?<TraceManagement scopeId={scopeId} mode="cleanup"/>:null}
      {active==='timeline'?<TimelinePlaceManager scopeId={scopeId}/>:null}
      {active==='quickFill'?<PlaceBatchFill scopeId={scopeId}/>:null}
    </div>
  </section>;
}
