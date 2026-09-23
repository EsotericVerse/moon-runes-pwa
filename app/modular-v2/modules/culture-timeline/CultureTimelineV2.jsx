'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

function timelineRows(items,labelOf){
  return (Array.isArray(items)?items:[]).flatMap((item,index)=>{
    const start=item?.start_date||item?.active_from||item?.date;
    if(!start||Number.isNaN(Date.parse(start)))return [];
    const end=item?.end_date||item?.active_until;
    const validEnd=end&&Date.parse(end)>Date.parse(start)?end:null;
    return [{
      id:String(item?.era_id||item?.period_id||item?.version||item?.id||index),
      content:labelOf(item,index),
      title:[item?.description,item?.milestone,item?.anchor_role,item?.anchor_type,item?.is_primary_anchor?'主要錨點':'',item?.is_rc_zone?'RC 區':''].filter(Boolean).join(' · '),
      start,
      ...(validEnd?{end:validEnd,type:'range'}:{type:'point'})
    }];
  });
}

export default function CultureTimelineV2({items=[],labelOf=(item,index)=>item?.display_label||item?.name||item?.title||item?.period||`項目 ${index+1}`}){
  const containerRef=useRef(null);
  const [ready,setReady]=useState(false);
  const rows=useMemo(()=>timelineRows(items,labelOf),[items,labelOf]);

  useEffect(()=>{
    let cancelled=false;
    let instance=null;
    if(!containerRef.current||!rows.length){setReady(false);return()=>{cancelled=true};}
    setReady(false);
    import('vis-timeline/standalone').then(({DataSet,Timeline})=>{
      if(cancelled||!containerRef.current)return;
      const data=new DataSet(rows);
      instance=new Timeline(containerRef.current,data,{
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
      instance.fit({animation:{duration:180,easingFunction:'easeInOutQuad'}});
      setReady(true);
    }).catch(()=>setReady(false));
    return()=>{cancelled=true;if(instance)instance.destroy();};
  },[rows]);

  if(!rows.length)return <p>目前沒有帶有有效日期的時期資料。</p>;

  return <div className="scope-period-timeline-wrap">
    {!ready?<p className="scope-v2-status">載入時間長河…</p>:null}
    <div ref={containerRef} className="scope-period-timeline" role="region" aria-label="時期時間長河" />
  </div>;
}
