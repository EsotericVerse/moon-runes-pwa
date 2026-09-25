'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

function escapeHtml(value){return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');}
function displayDate(value){
  if(!value)return '';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?String(value).slice(0,10):new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function dateInput(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return date.toISOString().slice(0,10);
}

export default function CultureVolumeGraph3D({
  periods=[],timelineItems=[],loading=false,error='',canEdit=false,
  onSelectWorkPoint=()=>{},onSelectTimelineEntry=()=>{},onCommand=()=>{}
}){
  const containerRef=useRef(null);
  const instanceRef=useRef(null);
  const pointActionsRef=useRef(new Map());
  const [graphError,setGraphError]=useState('');
  const [tool,setTool]=useState('view');
  const [anchorPair,setAnchorPair]=useState([]);
  const [message,setMessage]=useState('');

  const sourceNames=useMemo(()=>[...new Set(periods.flatMap(group=>(group.sources||[]).map(source=>source.source_platform)))].sort((a,b)=>a.localeCompare(b)),[periods]);
  const authorAnchors=useMemo(()=>timelineItems
    .filter(row=>row.scope_id==='lo3rwang'&&row.entry_type==='anchor'&&row.anchor_id&&row.start_date)
    .sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date))),[timelineItems]);

  const graphPoints=useMemo(()=>{
    const data=[];
    const actions=new Map();
    for(const periodEntry of periods){
      const period=periodEntry.period;
      if(!period?.start_date)continue;
      const time=Date.parse(period.start_date);
      for(const source of periodEntry.sources){
        const sourceIndex=sourceNames.indexOf(source.source_platform);
        const id='work:'+String(period.period||period.start_date)+':'+source.source_platform;
        data.push({
          id,x:time,y:sourceIndex+1,z:Math.max(1,source.item_count),
          style:Math.max(1,source.item_count),
          title:escapeHtml((period.display_label||period.title||period.period||'時期')+' · '+source.source_platform+' · '+source.item_count.toLocaleString()+' 項')
        });
        actions.set(id,{kind:'work',period,source_platform:source.source_platform,item_count:source.item_count});
      }
      const periodId='period:'+String(period.entry_key||period.period||time);
      data.push({id:periodId,x:time,y:0,z:0.5,style:18,title:escapeHtml((period.display_label||period.title||period.period||'時期')+' · 時期起點')});
      actions.set(periodId,{kind:'period',period});
    }

    for(const row of timelineItems){
      if(row.scope_id!=='lo3rwang'||!['anchor','event'].includes(row.entry_type))continue;
      const start=Date.parse(row.start_date||row.date||'');
      if(!Number.isFinite(start))continue;
      const end=Date.parse(row.end_date||'');
      const x=row.entry_type==='event'&&Number.isFinite(end)?(start+end)/2:start;
      const id='entry:'+String(row.entry_id||row.id||row.entry_key||x);
      data.push({
        id,x,y:row.entry_type==='anchor'?-0.18:-0.38,z:0.7,
        style:row.entry_type==='anchor'?20:14,
        title:escapeHtml((row.entry_type==='anchor'?'定錨點':'事件')+' · '+(row.display_label||row.title||'')+' · '+displayDate(row.start_date||row.date))
      });
      actions.set(id,{kind:'entry',row});
    }
    pointActionsRef.current=actions;
    return data;
  },[periods,timelineItems,sourceNames]);

  useEffect(()=>{
    let cancelled=false;
    let graph=null;
    let resizeObserver=null;
    setGraphError('');
    if(loading||!containerRef.current)return()=>{cancelled=true};
    if(!graphPoints.length){setGraphError('目前沒有可呈現的時期或作品來源資料。');return()=>{cancelled=true};}
    import('vis-graph3d/standalone').then(({Graph3d})=>{
      if(cancelled||!containerRef.current)return;
      graph=new Graph3d(containerRef.current,graphPoints,{
        width:'100%',height:'540px',style:'dot-size',showLegend:false,
        showPerspective:true,showGrid:true,keepAspectRatio:true,
        xLabel:'時間',yLabel:'來源／定錨軸',zLabel:'作品數',
        xMin:Math.min(...graphPoints.map(point=>point.x)),
        xMax:Math.max(...graphPoints.map(point=>point.x))+86400000,
        yMin:-1,yMax:Math.max(3,...graphPoints.map(point=>point.y)),
        zMin:0,tooltip:true,verticalRatio:0.8,
        xValueLabel:value=>displayDate(value),
        yValueLabel:value=>value===0?'時期／定錨點':value<0?'事件':(sourceNames[Math.round(value)-1]||''),
        zValueLabel:value=>Number(value).toLocaleString()
      });
      graph.on('click',point=>{
        if(!point?.id)return;
        const action=pointActionsRef.current.get(String(point.id));
        if(!action)return;
        if(canEdit&&tool==='anchor'){
          const date=action.kind==='period'?action.period.start_date:dateInput(point.x);
          if(!date)return;
          onCommand({scopeId:'lo3rwang',type:'anchor',values:{start_date:date}});
          setMessage('已在河道所選日期新增定錨點草稿。');
          setTool('view');
          return;
        }
        if(canEdit&&(tool==='event'||tool==='period')){
          if(action.kind!=='entry'||action.row.entry_type!=='anchor'||!action.row.anchor_id)return;
          const next=[...anchorPair,action.row].slice(-2);
          if(next.length===2){
            const before=String(next[0].start_date)<=String(next[1].start_date)?next[0]:next[1];
            const after=before===next[0]?next[1]:next[0];
            const isEvent=tool==='event';
            onCommand({
              scopeId:'lo3rwang',
              type:isEvent?'event':'period',
              values:isEvent
                ?{before_id:before.anchor_id,after_id:after.anchor_id}
                :{start_anchor_id:before.anchor_id,end_anchor_id:after.anchor_id}
            });
            setAnchorPair([]);
            setMessage(isEvent?'已選定事件前後定錨點。':'已選定時期起訖定錨點。');
            setTool('view');
          }else{
            setAnchorPair(next);
            setMessage('已選第一個定錨點，請再選第二個。');
          }
          return;
        }
        if(action.kind==='work')onSelectWorkPoint({...action,source_platform:action.source_platform});
        else if(action.kind==='entry')onSelectTimelineEntry(action.row);
        else if(action.kind==='period')onSelectTimelineEntry(action.period);
      });
      instanceRef.current=graph;
      resizeObserver=new ResizeObserver(()=>graph?.redraw());
      resizeObserver.observe(containerRef.current);
    }).catch(()=>{if(!cancelled)setGraphError('3D 河道載入失敗。');});
    return()=>{
      cancelled=true;
      resizeObserver?.disconnect();
      if(graph){
        graph.off?.('click');
        graph.destroy?.();
      }
      instanceRef.current=null;
      if(containerRef.current)containerRef.current.innerHTML='';
    };
  },[graphPoints,loading,canEdit,tool,onCommand,onSelectWorkPoint,onSelectTimelineEntry,sourceNames]);

  const startDrag=(event,anchor)=>event.dataTransfer.setData('text/plain',anchor.anchor_id);
  const dropEvent=(event,target)=>{
    event.preventDefault();
    const dragged=event.dataTransfer.getData('text/plain');
    if(!dragged||dragged===target.anchor_id)return;
    const first=authorAnchors.find(anchor=>anchor.anchor_id===dragged);
    const ordered=[first,target].sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
    onCommand({scopeId:'lo3rwang',type:'event',values:{before_id:ordered[0].anchor_id,after_id:ordered[1].anchor_id}});
    setMessage('已建立事件草稿，請補上名稱與說明後儲存。');
  };

  return <section className='scope-v2-card scope-v2-culture-3d'>
    <header className='scope-v2-culture-3d-heading'>
      <div><h3>時期 × 來源 × 作品量</h3><p>拖曳旋轉，滾輪縮放；點擊作品點可載入該時期與來源的分頁清單。</p></div>
      <span>3D</span>
    </header>
    {canEdit?<div className='scope-v2-tabs scope-v2-culture-3d-tools' aria-label='河道編輯工具'>
      <button type='button' aria-pressed={tool==='view'} onClick={()=>{setTool('view');setAnchorPair([]);setMessage('')}}>瀏覽／旋轉</button>
      <button type='button' aria-pressed={tool==='anchor'} onClick={()=>{setTool('anchor');setAnchorPair([]);setMessage('點選時期起點，在該日期建立定錨點。')}}>點河道新增定錨點</button>
      <button type='button' aria-pressed={tool==='event'} onClick={()=>{setTool('event');setAnchorPair([]);setMessage('點兩個定錨點，或將下方一個定錨點拖到另一個。')}}>建立事件</button>
      <button type='button' aria-pressed={tool==='period'} onClick={()=>{setTool('period');setAnchorPair([]);setMessage('依序點選時期的起點與終點定錨點。')}}>設定時期前後</button>
    </div>:null}
    {loading?<p className='scope-v2-status'>載入時期與來源作品量…</p>:null}
    {error?<p className='scope-v2-status scope-v2-error'>{error}</p>:null}
    {graphError?<p className='scope-v2-status'>{graphError}</p>:null}
    <div ref={containerRef} className='scope-v2-culture-3d-canvas' role='img' aria-label='可旋轉的時期、來源與作品量 3D 河道'/>
    {canEdit&&authorAnchors.length?<div className='scope-v2-culture-3d-anchor-rail' aria-label='拖曳定錨點以建立事件'>
      <strong>事件河段</strong>
      {authorAnchors.map(anchor=><button key={anchor.anchor_id} type='button' draggable
        onDragStart={event=>startDrag(event,anchor)}
        onDragOver={event=>event.preventDefault()}
        onDrop={event=>dropEvent(event,anchor)}
        onClick={()=>{
          if(tool!=='period')return;
          const next=[...anchorPair,anchor].slice(-2);
          if(next.length===2){
            const ordered=[...next].sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
            onCommand({scopeId:'lo3rwang',type:'period',values:{start_anchor_id:ordered[0].anchor_id,end_anchor_id:ordered[1].anchor_id}});
            setAnchorPair([]);
            setTool('view');
            setMessage('已選定時期起訖定錨點。');
          }else{
            setAnchorPair(next);
            setMessage('已選時期起點，請再選終點。');
          }
        }}>
        {displayDate(anchor.start_date)} · {anchor.title||anchor.anchor_id}
      </button>)}
    </div>:null}
    {message?<p className='scope-v2-status' role='status'>{message}</p>:null}
  </section>;
}
