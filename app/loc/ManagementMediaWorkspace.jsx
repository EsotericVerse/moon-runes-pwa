'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import {useEditDock} from '../modular/edit-dock';

const ManagementMediaPublisher=dynamic(()=>import('./ManagementMediaPublisher'),{loading:()=>null});
const SunoImportPanel=dynamic(()=>import('./SunoImportPanel'),{loading:()=>null});

// Suno is a multimedia publishing workflow, not an independent management
// category. Keep each editor's writes and authorization in its existing owner.
const MEDIA_KINDS=Object.freeze([
  {value:'media',label:'一般多媒體'},
  {value:'suno',label:'Suno 音樂'}
]);

export default function ManagementMediaWorkspace({scopeId}){
  const [kind,setKind]=useState('media');
  const editDock=useEditDock();
  function choose(next){
    if(next===kind)return;
    if(editDock?.active)editDock.switchSection(next,setKind);
    else setKind(next);
  }
  return <section className="management-media-workspace">
    <div className="scope-preview-links" role="group" aria-label="多媒體發表類型">
      {MEDIA_KINDS.map(item=><button type="button" key={item.value}
        className={'loc-button'+(item.value===kind?' primary':'')}
        aria-pressed={item.value===kind}
        onClick={()=>choose(item.value)}>{item.label}</button>)}
    </div>
    {kind==='media'?<ManagementMediaPublisher scopeId={scopeId}/>:
      <SunoImportPanel scopeId={scopeId}/>}
  </section>;
}
