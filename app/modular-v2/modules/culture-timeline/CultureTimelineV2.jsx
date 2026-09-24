'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {densityStyleForCount} from './culture-timeline-model.mjs';

function timelineRows(items,labelOf,focus){
  const focusTerms=[focus?.identity,focus?.period,focus?.anchor].filter(Boolean).map(String);
  return (Array.isArray(items)?items:[]).flatMap((item,index)=>{
    const start=item?.start_date||item?.active_from||item?.date;
    if(!start||Number.isNaN(Date.parse(start)))return [];
    const end=item?.end_date||item?.active_until;
    const validEnd=end&&Date.parse(end)>Date.parse(start)?end:null;
    const candidateValues=[
      item?.era_id,item?.period_id,item?.version,item?.id,item?.period,item?.name,item?.title,
      item?.anchor_id,item?.anchor_role,item?.anchor_type
    ].filter(Boolean).map(String);
    const focused=focusTerms.some(term=>candidateValues.includes(term));
    const group=item?.group_label||item?.scope_id||'';
    const density=densityStyleForCount(item?.work_count);
    return [{
      id:String(item?.era_id||item?.period_id||item?.version||item?.id||item?.entry_id||index),
      content:labelOf(item,index),
      title:[item?.description,item?.milestone,item?.anchor_role,item?.anchor_type,item?.is_primary_anchor?'主要錨點':'',item?.is_rc_zone?'RC 區':''].filter(Boolean).join(' · '),
      start,
      ...(group?{group:String(group)}:{}),
      ...(validEnd?{end:validEnd,type:'range'}:{type:'point'}),
      ...(focused?{className:'scope-period-timeline-focus'}:{}),
      ...(density?{style:`background-color:var(--loc-panel);border-color:var(--loc-accent);color:var(--loc-text);filter:brightness(${density.brightness});box-shadow:0 0 ${density.blur} color-mix(in srgb,var(--loc-accent) ${Math.round(density.glow*100)}%,transparent);`}:{})
    }];
  });
}

function groupLabel(id){
  if(id==='lo3rwang')return 'lo3rwang 時期';
  if(id==='runes')return 'LunaRunes 沿革';
  return id;
}

export default function CultureTimelineV2({items=[],labelOf=(item,index)=>item?.display_label||item?.name||item?.title||item?.period||'項目 '+(index+1),focus={},mode='period',onSelect=null}){
  const containerRef=useRef(null);
  const onSelectRef=useRef(onSelect);
  const [ready,setReady]=useState(false);
  const [chartError,setChartError]=useState(false);
  const rows=useMemo(()=>timelineRows(items,labelOf,focus),[items,labelOf,focus]);
  const fallbackRows=useMemo(()=>[...rows].sort((a,b)=>String(b.start).localeCompare(String(a.start))).slice(0,50),[rows]);

  useEffect(()=>{onSelectRef.current=onSelect},[onSelect]);

  useEffect(()=>{
    let cancelled=false;
    let instance=null;
    setChartError(false);
    if(!containerRef.current||!rows.length){setReady(false);return()=>{cancelled=true};}
    setReady(false);
    import('vis-timeline/standalone').then(({DataSet,Timeline})=>{
      if(cancelled||!containerRef.current)return;
      const data=new DataSet(rows);
      const groupIds=[...new Set(rows.map(row=>row.group).filter(Boolean))];
      const groups=groupIds.length>1?new DataSet(groupIds.map(id=>({id,content:groupLabel(id)}))):null;
      instance=new Timeline(containerRef.current,data,groups,{
        autoResize:true,
        height:'260px',
        horizontalScroll:true,
        zoomKey:'ctrlKey',
        zoomMin:1000*60*60*24*14,
        zoomMax:1000*60*60*24*365*50,
        selectable:true,
        moveable:true,
        showCurrentTime:false,
        stack:true,
        margin:{item:{horizontal:8,vertical:12}}
      });
      instance.on('select',({items:selectedItems=[]})=>{
        const selectedId=selectedItems[0];
        onSelectRef.current?.(rows.find(row=>row.id===selectedId)||null);
      });
      instance.fit({animation:{duration:180,easingFunction:'easeInOutQuad'}});
      setReady(true);
    }).catch(()=>{if(!cancelled){setReady(false);setChartError(true)}});
    return()=>{cancelled=true;if(instance)instance.destroy();};
  },[rows]);

  if(!rows.length)return <div className='scope-period-timeline-wrap scope-period-timeline-empty'><div className='scope-period-timeline scope-period-timeline-empty-line' role='region' aria-label='時間長河'/><p>{mode==='overview'?'尚未設定時期，目前以「所有」總覽顯示。':'目前時期尚無可顯示的時間資料。'}</p></div>;

  return <div className='scope-period-timeline-wrap'>
    {!ready&&!chartError?<p className='scope-v2-status'>載入時間長河…</p>:null}
    {chartError?<p className='scope-v2-status'>圖表載入失敗，以下改用清單顯示。</p>:null}
    <div ref={containerRef} className='scope-period-timeline' role='region' aria-label={mode==='overview'?'所有時期時間長河':'時期時間長河'} />
    {chartError?<ol className='scope-v2-list'>
      {fallbackRows.map(row=><li key={row.id}><strong>{row.content}</strong>{row.group?<span> · {groupLabel(row.group)}</span>:null}<span> · {new Date(row.start).toLocaleDateString('zh-Hant')}</span>{row.title?<p>{row.title}</p>:null}</li>)}
    </ol>:null}
  </div>;
}
