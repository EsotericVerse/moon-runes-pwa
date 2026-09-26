'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {densityStyleForCount,formatCultureDateTime} from './culture-timeline-model.mjs';

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
      id:String(item?.id||item?.entry_id||item?.era_id||item?.period_id||item?.version||index),
      content:labelOf(item,index),
      title:[item?.description,item?.milestone,item?.anchor_role,item?.anchor_type,item?.is_primary_anchor?'主要錨點':'',item?.is_rc_zone?'RC 區':''].filter(Boolean).join(' · '),
      start,
      scopeId:String(item?.scope_id||''),
      entryType:String(item?.entry_type||''),
      period:String(item?.period||''),
      runeCount:Number(item?.rune_count||0),
      status:String(item?.status||''),
      ...(group?{group:String(group)}:{}),
      ...(validEnd?{end:validEnd,type:'range'}:{type:'point'}),
      ...(focused?{className:'scope-period-timeline-focus'}:{}),
      ...(density?{style:'background-color:var(--loc-panel);border-color:var(--loc-accent);color:var(--loc-text);filter:brightness('+density.brightness+');box-shadow:0 0 '+density.blur+' color-mix(in srgb,var(--loc-accent) '+Math.round(density.glow*100)+'%,transparent);'}:{})
    }];
  });
}

function groupLabel(id){
  if(id==='lo3rwang')return '個人時期';
  if(id==='lunarunes')return 'LunaRunes 沿革';
  if(String(id).startsWith('lo3rwang ·'))return String(id).replace('lo3rwang ·','個人時期 ·');
  if(String(id).startsWith('lunarunes ·'))return String(id).replace('lunarunes ·','LunaRunes ·');
  return id;
}
function dateLabel(value){
  const formatted=formatCultureDateTime(value);
  return formatted.length>=10?formatted.slice(0,10):formatted;
}
function riverPath(startX,endX,yAt,steps=48){
  const points=[];
  for(let index=0;index<=steps;index++){
    const x=startX+(endX-startX)*index/steps;
    points.push((index===0?'M':'L')+x.toFixed(1)+' '+yAt(x).toFixed(1));
  }
  return points.join(' ');
}

function CurrentCultureRivers({rows,canAddAnchor=false,onAddAnchor=null}){
  const personal=[...rows].filter(row=>row.scopeId==='lo3rwang').sort((a,b)=>Date.parse(a.start)-Date.parse(b.start)||(a.entryType==='period'?-1:0));
  const runes=[...rows].filter(row=>row.scopeId==='lunarunes').sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
  const personalStart=personal.find(row=>row.entryType==='period'&&row.status.trim().toLowerCase()==='current')||personal.find(row=>row.status.trim().toLowerCase()==='current');
  const runeStart=runes.find(row=>row.status.trim().toLowerCase()==='current');
  if(!personalStart||!runeStart)return <div className='scope-period-timeline-wrap scope-period-timeline-empty'><p>目前缺少個人時期或符文 Current 定錨資料。</p></div>;

  const personalStartTime=Date.parse(personalStart.start);
  const runeStartTime=Date.parse(runeStart.start);
  const validTimes=rows.map(row=>Date.parse(row.start)).filter(Number.isFinite);
  const domainStart=Math.min(runeStartTime,personalStartTime,...validTimes);
  let domainEnd=Math.max(personalStartTime+86400000,...validTimes);
  if(domainEnd<=domainStart)domainEnd=domainStart+30*86400000;
  const left=120;
  const right=1080;
  const xFor=time=>left+(time-domainStart)/(domainEnd-domainStart)*(right-left);
  const runeX=xFor(runeStartTime);
  const personalX=xFor(personalStartTime);
  const centerY=330;
  const authorEntryX=Math.max(left,personalX-72);
  const authorY=x=>x<personalX?centerY-(personalX-x)*.78:centerY+(x-personalX)*.1;
  const runeY=x=>centerY+(personalX-x)*.14;
  const authorPath=riverPath(authorEntryX,right,authorY,40);
  const runePath=riverPath(runeX,right,runeY,56);
  const authorColor='var(--loc-personal-river,#2878c9)';
  const runeColor='var(--loc-rune-river,#9855bd)';
  const marker=(row,index,channel)=>{
    const x=xFor(Date.parse(row.start));
    const baseY=channel==='personal'?authorY(x):runeY(x);
    const isCurrent=row.status.trim().toLowerCase()==='current';
    const isKeyMarker=row.entryType==='period'||row.runeCount===66;
    const offset=isCurrent?(channel==='personal'?-16:16):(isKeyMarker?0:(index%2===0?-12:12));
    const y=baseY+offset;
    const color=channel==='personal'?authorColor:runeColor;
    return <g key={row.id}>
      {offset?<line x1={x} y1={baseY} x2={x} y2={y} stroke={color} strokeWidth='2' strokeDasharray='3 3' opacity='.8'/>:null}
      <circle cx={x} cy={y} r={isCurrent||isKeyMarker?12:8} fill={color} stroke='var(--loc-panel,#fff)' strokeWidth='4'>
        <title>{row.content+' · '+dateLabel(row.start)}</title>
      </circle>
    </g>;
  };
  const lastDate=dateLabel(Math.max(...validTimes));
  const personalTitle=personalStart.content||'Current 個人時期';
  const runeTitle=runeStart.content||'符文66';
  const chooseDate=event=>{
    if(!canAddAnchor||!onAddAnchor)return;
    const svg=event.currentTarget.ownerSVGElement;
    if(!svg)return;
    const rect=svg.getBoundingClientRect();
    const x=(event.clientX-rect.left)*1200/Math.max(1,rect.width);
    const clamped=Math.max(left,Math.min(right,x));
    const time=domainStart+(clamped-left)/(right-left)*(domainEnd-domainStart);
    onAddAnchor(new Date(time).toISOString().slice(0,10));
  };

  return <section className='scope-v2-current-rivers'>
    <div className='scope-v2-current-rivers-canvas' style={{overflowX:'auto',margin:'1rem 0 1.25rem'}}>
      <svg viewBox='0 0 1200 640' role='img' aria-label='Current 個人時期與符文66交會時間河道' style={{display:'block',width:'100%',minWidth:'900px',height:'640px'}}>
        <title>Current 個人時期與符文66的交會時間河道</title>
        <rect x='20' y='20' width='1160' height='600' rx='24' fill='var(--loc-panel,#fff)' stroke='var(--loc-border,#999)' strokeWidth='1'/>
        <text x='64' y='72' fill='var(--loc-text,#111)' fontSize='23' fontWeight='700'>兩條 Current 河道</text>
        <text x={runeX} y='148' fill='var(--loc-text,#111)' fontSize='16' fontWeight='700'>{runeTitle+' · '+dateLabel(runeStart.start)}</text>
        <text x={personalX} y='112' fill='var(--loc-text,#111)' fontSize='16' fontWeight='700'>{personalTitle+' · '+dateLabel(personalStart.start)}</text>
        <path d={authorPath} fill='none' stroke={authorColor} strokeWidth='30' strokeLinecap='round' opacity='.18'/>
        <path d={runePath} fill='none' stroke={runeColor} strokeWidth='30' strokeLinecap='round' opacity='.18'/>
        <path d={authorPath} fill='none' stroke={authorColor} strokeWidth='13' strokeLinecap='round' strokeLinejoin='round'/>
        <path d={runePath} fill='none' stroke={runeColor} strokeWidth='13' strokeLinecap='round' strokeLinejoin='round'/>
        <path d={authorPath} fill='none' stroke='var(--loc-panel,#fff)' strokeWidth='2' strokeLinecap='round' opacity='.7'/>
        {canAddAnchor?<path d={authorPath} fill='none' stroke='transparent' strokeWidth='38' strokeLinecap='round' pointerEvents='stroke' style={{cursor:'crosshair'}} onClick={chooseDate}><title>點擊日期新增定錨點</title></path>:null}
        <path d={runePath} fill='none' stroke='var(--loc-panel,#fff)' strokeWidth='2' strokeLinecap='round' opacity='.7'/>
        <circle cx={personalX} cy={centerY} r='21' fill='none' stroke='var(--loc-text,#111)' strokeWidth='3'/>
        <circle cx={personalX} cy={centerY} r='5' fill='var(--loc-accent,#2878c9)'/>
        {personal.map((row,index)=>marker(row,index,'personal'))}
        {runes.map((row,index)=>marker(row,index,'runes'))}
        <rect x={personalX-142} y='190' width='284' height='42' rx='21' fill='var(--loc-panel,#fff)' stroke='var(--loc-text,#111)' strokeWidth='1.5'/>
        <text x={personalX} y='217' textAnchor='middle' fill='var(--loc-text,#111)' fontSize='16' fontWeight='700'>{personalStart.content+' × '+runeTitle+' · Current 交會'}</text>
        <line x1='120' y1='552' x2='1080' y2='552' stroke='var(--loc-text,#111)' strokeWidth='1' opacity='.3'/>
        <text x='120' y='580' fill='var(--loc-text,#111)' fontSize='14'>{dateLabel(domainStart)+' 起'}</text>
        <text x='1080' y='580' textAnchor='end' fill='var(--loc-text,#111)' fontSize='14'>{'目前資料至 '+lastDate}</text>
      </svg>
    </div>
    <div className='loc-grid two'>
      <section className='scope-v2-card'>
        <h3>個人時期 · {personalTitle}</h3>
        <ol className='scope-v2-list'>
          {personal.map(row=><li key={row.id}><strong>{row.content}</strong><span> · {dateLabel(row.start)}</span>{row.end?<span> – {dateLabel(row.end)}</span>:null}</li>)}
        </ol>
      </section>
      <section className='scope-v2-card'>
        <h3>LunaRunes · {runeTitle}</h3>
        <ol className='scope-v2-list'>
          {runes.map(row=><li key={row.id}><strong>{row.content}</strong><span> · {dateLabel(row.start)}</span>{row.end?<span> – {dateLabel(row.end)}</span>:null}</li>)}
        </ol>
      </section>
    </div>
  </section>;
}

export default function CultureTimelineV2({items=[],labelOf=(item,index)=>item?.display_label||item?.name||item?.title||item?.period||'項目 '+(index+1),focus={},mode='period',onSelect=null,canAddAnchor=false,onAddAnchor=null}){
  const containerRef=useRef(null);
  const onSelectRef=useRef(onSelect);
  const onAddAnchorRef=useRef(onAddAnchor);
  const [ready,setReady]=useState(false);
  const [chartError,setChartError]=useState(false);
  const rows=useMemo(()=>timelineRows(items,labelOf,focus),[items,labelOf,focus]);
  const fallbackRows=useMemo(()=>[...rows].sort((a,b)=>String(b.start).localeCompare(String(a.start))),[rows]);
  const currentConfluence=mode==='current'&&rows.some(row=>row.scopeId==='lo3rwang'&&row.status.trim().toLowerCase()==='current')&&rows.some(row=>row.scopeId==='lunarunes'&&row.status.trim().toLowerCase()==='current');
  const timelineHeight=mode==='overview'?Math.max(640,Math.min(1400,440+rows.length*18)):640;

  useEffect(()=>{onSelectRef.current=onSelect},[onSelect]);
  useEffect(()=>{onAddAnchorRef.current=onAddAnchor},[onAddAnchor]);

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
      const groups=groupIds.length?new DataSet(groupIds.map(id=>({id,content:groupLabel(id)}))):null;
      instance=new Timeline(containerRef.current,data,groups,{
        autoResize:true,
        height:timelineHeight+'px',
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
      instance.on('click',properties=>{
        if(!canAddAnchor||!properties?.time||!['background','axis'].includes(String(properties.what||'')))return;
        onAddAnchorRef.current?.(new Date(properties.time).toISOString().slice(0,10));
      });
      instance.fit({animation:{duration:180,easingFunction:'easeInOutQuad'}});
      setReady(true);
    }).catch(()=>{if(!cancelled){setReady(false);setChartError(true)}});
    return()=>{cancelled=true;if(instance)instance.destroy();};
  },[rows,timelineHeight,canAddAnchor]);

  if(currentConfluence)return <CurrentCultureRivers rows={rows} canAddAnchor={canAddAnchor} onAddAnchor={onAddAnchor}/>;
  if(!rows.length)return <div className='scope-period-timeline-wrap scope-period-timeline-empty'><div className='scope-period-timeline scope-period-timeline-empty-line' role='region' aria-label='時間長河'/><p>{mode==='overview'?'尚未設定時期，目前以「所有」總覽顯示。':'目前時期尚無可顯示的時間資料。'}</p></div>;

  return <div className='scope-period-timeline-wrap'>
    {!ready&&!chartError?<p className='scope-v2-status'>載入時間長河…</p>:null}
    {chartError?<p className='scope-v2-status'>圖表載入失敗，以下改用清單顯示。</p>:null}
    <div ref={containerRef} className='scope-period-timeline' role='region' aria-label={mode==='overview'?'所有時期與定錨點時間長河':'Current 時期時間長河'} style={{minHeight:timelineHeight+'px'}}/>
    {chartError?<ol className='scope-v2-list'>
      {fallbackRows.map(row=><li key={row.id}><strong>{row.content}</strong>{row.group?<span> · {groupLabel(row.group)}</span>:null}<span> · {dateLabel(row.start)}</span>{row.title?<p>{row.title}</p>:null}</li>)}
    </ol>:null}
  </div>;
}
