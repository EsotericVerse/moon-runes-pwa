'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {densityStyleForCount,densityStyleForRatio,formatCultureDateTime} from './culture-timeline-model.mjs';

function timelineRows(items,labelOf,focus){
  const source=Array.isArray(items)?items:[];
  const focusTerms=[focus?.identity,focus?.period,focus?.anchor].filter(Boolean).map(String);
  const knownTimes=source.flatMap(item=>[
    item?.start_date,item?.active_from,item?.date,item?.end_date,item?.active_until
  ]).map(value=>Date.parse(value||'')).filter(Number.isFinite);
  const today=Date.parse(new Date().toISOString().slice(0,10));
  const domainStart=knownTimes.length?Math.min(...knownTimes):today;
  const domainEnd=Math.max(today,...knownTimes);
  return source.flatMap((item,index)=>{
    const rawStart=item?.start_date||item?.active_from||item?.date;
    const rawEnd=item?.end_date||item?.active_until;
    const openStart=Boolean(item?.open_start);
    const openEnd=Boolean(item?.open_end);
    const parsedStart=Date.parse(rawStart||'');
    const parsedEnd=Date.parse(rawEnd||'');
    const start=Number.isFinite(parsedStart)?rawStart:(openStart&&Number.isFinite(parsedEnd)?new Date(domainStart).toISOString().slice(0,10):null);
    if(!start||Number.isNaN(Date.parse(start)))return [];
    let end=Number.isFinite(parsedEnd)&&parsedEnd>Date.parse(start)?rawEnd:null;
    if(!end&&openEnd&&domainEnd>Date.parse(start))end=new Date(domainEnd).toISOString().slice(0,10);
    const candidateValues=[
      item?.era_id,item?.period_id,item?.version,item?.id,item?.period,item?.name,item?.title,
      item?.anchor_id,item?.anchor_role,item?.anchor_type
    ].filter(Boolean).map(String);
    const focused=focusTerms.some(term=>candidateValues.includes(term));
    const group=item?.group_label||item?.scope_id||'';
    const ratio=Number(item?.global_density_ratio)>0?Number(item.global_density_ratio):Number(item?.density_ratio)||0;
    const density=ratio>0?densityStyleForRatio(ratio):densityStyleForCount(item?.work_count);
    return [{
      id:String(item?.id||item?.entry_id||item?.era_id||item?.period_id||item?.version||index),
      content:labelOf(item,index),
      title:[
        item?.title,item?.description,item?.milestone,item?.anchor_role,item?.anchor_type,
        openStart?'A 之前／open start':'',openEnd?'A 之後／open end':'',
        item?.date_status==='year_only'?'僅年份':'',
        item?.is_primary_anchor?'主要錨點':'',item?.is_rc_zone?'RC 區':''
      ].filter(Boolean).join(' · '),
      start,
      scopeId:String(item?.scope_id||''),
      entryType:String(item?.entry_type||''),
      period:String(item?.period||''),
      runeCount:Number(item?.rune_count||0),
      workCount:Number(item?.work_count||0),
      status:String(item?.status||''),
      openStart,openEnd,
      ...(group?{group:String(group)}:{}),
      ...(end?{end,type:'range'}:{type:'point'}),
      ...(focused?{className:'scope-period-timeline-focus'}:{}),
      ...(density?{
        className:[focused?'scope-period-timeline-focus':'','scope-period-density'].filter(Boolean).join(' '),
        style:'--culture-density:'+Math.max(.08,Math.min(1,ratio||Math.min(1,Number(item?.work_count||0)/100)))+';height:'+(8+Math.round(Math.max(.08,Math.min(1,ratio||0))*20))+'px;background:color-mix(in srgb,var(--loc-accent) '+Math.round((.12+density.glow*.72)*100)+'%,var(--loc-panel));border-color:color-mix(in srgb,var(--loc-accent) '+Math.round((.36+density.glow*.56)*100)+'%,var(--loc-line));color:var(--loc-text);filter:brightness('+density.brightness+');box-shadow:0 0 '+density.blur+' color-mix(in srgb,var(--loc-accent) '+Math.round(density.glow*100)+'%,transparent);'
      }:{})
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

function CurrentCultureRivers({ranges,onSelect=null}){
  const personalCurrent=(ranges||[]).find(row=>String(row?.scope_id||'')==='lo3rwang')||null;
  const runeCurrent=(ranges||[]).find(row=>String(row?.scope_id||'')==='lunarunes')||null;
  if(!personalCurrent||!runeCurrent)return <div className='scope-period-timeline-wrap scope-period-timeline-empty'><p>目前缺少可計算的時間範圍。</p></div>;

  const personalStartTime=Date.parse(personalCurrent.start_date||'');
  const runeStartTime=Date.parse(runeCurrent.start_date||'');
  const intersectionStart=Math.max(personalStartTime,runeStartTime);
  const domainStart=intersectionStart;
  const today=Date.parse(new Date().toISOString().slice(0,10));
  const personalEnd=Date.parse(personalCurrent.end_date||'');
  const runeEnd=Date.parse(runeCurrent.end_date||'');
  const personalBound=Number.isFinite(personalEnd)?Math.min(personalEnd,today):today;
  const runeBound=Number.isFinite(runeEnd)?Math.min(runeEnd,today):today;
  const intersectionEnd=Math.min(personalBound,runeBound);

  if(!Number.isFinite(intersectionStart)||intersectionEnd<intersectionStart){
    return <div className='scope-period-timeline-wrap scope-period-timeline-empty'><p>目前兩個 Current 時期沒有交集。</p></div>;
  }

  const left=120;
  const right=1080;
  const centerY=330;
  const intersectionPath=riverPath(left,right,()=>centerY,24);
  const intersectionColor='var(--loc-accent,#6b63ff)';
  const personalTitle=personalCurrent.display_label||personalCurrent.title||'目前個人時期';
  const runeTitle=runeCurrent.display_label||runeCurrent.title||'目前 LunaRunes';
  const personalCount=Number(personalCurrent.work_count)||0;
  const runeCount=Number(runeCurrent.work_count)||0;
  const startLabel=dateLabel(domainStart);
  const endLabel=dateLabel(intersectionEnd);

  return <section className='scope-v2-current-rivers'>
    <div className='scope-v2-current-rivers-canvas' role='button' tabIndex={0} onClick={()=>onSelect?.({type:'current-intersection'})} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect?.({type:'current-intersection'});}}} style={{overflowX:'auto',margin:'1rem 0 1.25rem',cursor:onSelect?'pointer':'default'}}>
      <svg viewBox='0 0 1200 520' role='img' aria-label='Current 個人時期與 LunaRunes Current 的交集時間河道' style={{display:'block',width:'100%',minWidth:'900px',height:'520px'}}>
        <title>兩個 Scope Current 時期的集合交集</title>
        <rect x='20' y='20' width='1160' height='480' rx='24' fill='var(--loc-panel,#fff)' stroke='var(--loc-border,#999)' strokeWidth='1'/>
        <text x='64' y='72' fill='var(--loc-text,#111)' fontSize='23' fontWeight='700'>Current × Current 交會集合</text>
        <text x='64' y='104' fill='var(--loc-muted,#666)' fontSize='14'>只顯示兩個 Current 同時成立的集合交集，不做加總。</text>

        <text x='600' y='188' textAnchor='middle' fill='var(--loc-text,#111)' fontSize='16' fontWeight='700'>{personalTitle} ∩ {runeTitle}</text>
        <text x='600' y='218' textAnchor='middle' fill='var(--loc-muted,#666)' fontSize='14'>個人 {personalCount.toLocaleString()} 項 · LunaRunes {runeCount.toLocaleString()} 項</text>
        <path d={intersectionPath} fill='none' stroke={intersectionColor} strokeWidth='30' strokeLinecap='round' opacity='.18'/>
        <path d={intersectionPath} fill='none' stroke={intersectionColor} strokeWidth='13' strokeLinecap='round'/>
        <circle cx={left} cy={centerY} r='11' fill={intersectionColor} stroke='var(--loc-panel,#fff)' strokeWidth='4'/>
        <circle cx={right} cy={centerY} r='11' fill={intersectionColor} stroke='var(--loc-panel,#fff)' strokeWidth='4'/>
        <text x='600' y={centerY-28} textAnchor='middle' fill='var(--loc-text,#111)' fontSize='16' fontWeight='700'>A ∩ B</text>

        <line x1='120' y1='430' x2='1080' y2='430' stroke='var(--loc-text,#111)' strokeWidth='1' opacity='.3'/>
        <text x='120' y='458' fill='var(--loc-text,#111)' fontSize='14'>{startLabel+' 起'}</text>
        <text x='1080' y='458' textAnchor='end' fill='var(--loc-text,#111)' fontSize='14'>{endLabel+' 止'}</text>
      </svg>
    </div>
  </section>;
}

export default function CultureTimelineV2({items=[],labelOf=(item,index)=>item?.display_label||item?.name||item?.title||item?.period||'項目 '+(index+1),focus={},mode='period',currentRanges=[],onSelect=null}){
  const containerRef=useRef(null);
  const onSelectRef=useRef(onSelect);
  const [ready,setReady]=useState(false);
  const [chartError,setChartError]=useState(false);
  const rows=useMemo(()=>timelineRows(items,labelOf,focus),[items,labelOf,focus]);
  const fallbackRows=useMemo(()=>[...rows].sort((a,b)=>String(b.start).localeCompare(String(a.start))),[rows]);
  const currentConfluence=mode==='current'&&currentRanges.some(row=>String(row?.scope_id||'')==='lo3rwang')&&currentRanges.some(row=>String(row?.scope_id||'')==='lunarunes');
  const groupCount=new Set(rows.map(row=>row.group).filter(Boolean)).size;
  const compactGroupCount=Math.max(1,groupCount||rows.length);
  const timelineHeight=(mode==='source'||mode==='overview')
    ?Math.max(220,Math.min(560,96+compactGroupCount*46))
    :640;

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
        margin:mode==='source'
          ?{axis:10,item:{horizontal:3,vertical:5}}
          :{item:{horizontal:8,vertical:12}}
      });
      instance.on('select',({items:selectedItems=[]})=>{
        const selectedId=selectedItems[0];
        onSelectRef.current?.(rows.find(row=>row.id===selectedId)||null);
      });
      instance.fit({animation:{duration:180,easingFunction:'easeInOutQuad'}});
      setReady(true);
    }).catch(()=>{if(!cancelled){setReady(false);setChartError(true)}});
    return()=>{cancelled=true;if(instance)instance.destroy();};
  },[rows,timelineHeight]);

  if(currentConfluence)return <CurrentCultureRivers ranges={currentRanges} onSelect={onSelect}/>;
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
