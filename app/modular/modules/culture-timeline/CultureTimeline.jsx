'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {DataSet,Timeline} from 'vis-timeline/standalone';
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
    const densityRatio=Number(item?.global_density_ratio)>0?Number(item.global_density_ratio):Number(item?.density_ratio)||0;
    if(!end&&densityRatio>0){
      const next=new Date(Date.parse(start));
      next.setUTCDate(next.getUTCDate()+1);
      end=next.toISOString().slice(0,10);
    }
    if(!end&&openEnd&&domainEnd>Date.parse(start))end=new Date(domainEnd).toISOString().slice(0,10);
    const candidateValues=[
      item?.era_id,item?.period_id,item?.version,item?.id,item?.period,item?.name,item?.title,
      item?.anchor_id,item?.anchor_role,item?.anchor_type
    ].filter(Boolean).map(String);
    const focused=focusTerms.some(term=>candidateValues.includes(term));
    const group=item?.group_label||item?.scope_id||'';
    const ratio=densityRatio;
    const density=ratio>0?densityStyleForRatio(ratio):densityStyleForCount(item?.item_count);
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
      recordId:String(item?.record_id||item?.recordId||''),
      scopeId:String(item?.scope_id||''),
      entryType:String(item?.entry_type||''),
      period:String(item?.period||''),
      runeCount:Number(item?.rune_count||0),
      workCount:Number(item?.item_count||0),
      status:String(item?.status||''),
      openStart,openEnd,
      ...(group?{group:String(group)}:{}),
      ...(end?{end,type:'range'}:{type:'point'}),
      ...(focused?{className:'scope-period-timeline-focus'}:{}),
      ...(density?{
        className:[focused?'scope-period-timeline-focus':'','scope-period-density'].filter(Boolean).join(' '),
        style:'--culture-density:'+Math.max(.08,Math.min(1,ratio||Math.min(1,Number(item?.item_count||0)/100)))+';height:'+(8+Math.round(Math.max(.08,Math.min(1,ratio||0))*20))+'px;background:color-mix(in srgb,var(--loc-accent) '+Math.round((.12+density.glow*.72)*100)+'%,var(--loc-panel));border-color:color-mix(in srgb,var(--loc-accent) '+Math.round((.36+density.glow*.56)*100)+'%,var(--loc-line));color:var(--loc-text);filter:brightness('+density.brightness+');box-shadow:0 0 '+density.blur+' color-mix(in srgb,var(--loc-accent) '+Math.round(density.glow*100)+'%,transparent);'
      }:{})
    }];
  });
}

function groupLabel(id){
  return String(id||'');
}
function dateLabel(value){
  const formatted=formatCultureDateTime(value);
  return formatted.length>=10?formatted.slice(0,10):formatted;
}

export default function CultureTimeline({items=[],labelOf=(item,index)=>item?.display_label||item?.name||item?.title||item?.period||'項目 '+(index+1),focus={},mode='period',onSelect=null,onTimeClick=null,windowStart='',windowEnd='',boundaryStart='',boundaryEnd='',onBoundaryNavigate=null,fixedMin='',fixedMax='',hiddenDates=[]}){
  const containerRef=useRef(null);
  const onSelectRef=useRef(onSelect);
  const onTimeClickRef=useRef(onTimeClick);
  const onBoundaryNavigateRef=useRef(onBoundaryNavigate);
  const [ready,setReady]=useState(false);
  const [chartError,setChartError]=useState(false);
  const rows=useMemo(()=>timelineRows(items,labelOf,focus),[items,labelOf,focus]);
  const fallbackRows=useMemo(()=>[...rows].sort((a,b)=>String(b.start).localeCompare(String(a.start))),[rows]);
  const groupCount=new Set(rows.map(row=>row.group).filter(Boolean)).size;
  const compactGroupCount=Math.max(1,groupCount||rows.length);
  const timelineMinHeight=Math.max(180,96+compactGroupCount*46);
  const timelineMaxHeight=Math.max(360,Math.min(760,180+compactGroupCount*92));

  useEffect(()=>{onSelectRef.current=onSelect},[onSelect]);
  useEffect(()=>{onTimeClickRef.current=onTimeClick},[onTimeClick]);
  useEffect(()=>{onBoundaryNavigateRef.current=onBoundaryNavigate},[onBoundaryNavigate]);

  useEffect(()=>{
    let cancelled=false;
    let instance=null;
    setChartError(false);
    if(!containerRef.current||!rows.length){setReady(false);return()=>{cancelled=true};}
    setReady(false);
    try{
      if(cancelled||!containerRef.current)return()=>{cancelled=true};
      const data=new DataSet(rows);
      const groupIds=[...new Set(rows.map(row=>row.group).filter(Boolean))];
      const groups=groupIds.length?new DataSet(groupIds.map(id=>({id,content:groupLabel(id)}))):null;
      instance=new Timeline(containerRef.current,data,groups,{
        autoResize:true,
        minHeight:timelineMinHeight+'px',
        maxHeight:timelineMaxHeight+'px',
        verticalScroll:true,
        locale:'zh-tw',
        locales:{
          'zh-tw':{
            current:'目前',
            time:'時間',
            deleteSelected:'刪除所選項目'
          }
        },
        format:{
          minorLabels:{
            millisecond:'SSS',
            second:'s秒',
            minute:'HH:mm',
            hour:'HH:mm',
            weekday:'M/D',
            day:'M/D',
            week:'M/D',
            month:'M月',
            year:'YYYY'
          },
          majorLabels:{
            millisecond:'YYYY/M/D HH:mm:ss',
            second:'YYYY/M/D HH:mm',
            minute:'YYYY/M/D',
            hour:'YYYY/M/D',
            weekday:'YYYY/M',
            day:'YYYY/M',
            week:'YYYY/M',
            month:'YYYY年',
            year:''
          }
        },
        horizontalScroll:true,
        zoomKey:'ctrlKey',
        zoomMin:1000*60*60*24*14,
        zoomMax:1000*60*60*24*365*50,
        ...(Array.isArray(hiddenDates)&&hiddenDates.length?{hiddenDates}:{}),
        ...(fixedMin&&Number.isFinite(Date.parse(fixedMin))?{min:fixedMin}:{}),
        ...(fixedMax&&Number.isFinite(Date.parse(fixedMax))?{max:fixedMax}:{}),
        selectable:true,
        moveable:true,
        showCurrentTime:false,
        stack:mode!=='source',
        margin:mode==='source'
          ?{axis:10,item:{horizontal:3,vertical:5}}
          :{item:{horizontal:8,vertical:12}}
      });
      instance.on('select',({items:selectedItems=[]})=>{
        const selectedId=selectedItems[0];
        onSelectRef.current?.(rows.find(row=>row.id===selectedId)||null);
      });
      instance.on('rangechanged',properties=>{
        if(!onBoundaryNavigateRef.current||fixedMin||fixedMax||properties?.byUser!==true)return;
        const startMs=Date.parse(boundaryStart||windowStart||'');
        const endMs=Date.parse(boundaryEnd||windowEnd||'');
        const visibleStart=properties?.start instanceof Date?properties.start.getTime():Date.parse(properties?.start||'');
        const visibleEnd=properties?.end instanceof Date?properties.end.getTime():Date.parse(properties?.end||'');
        if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||!Number.isFinite(visibleStart)||!Number.isFinite(visibleEnd)||endMs<=startMs)return;
        const threshold=Math.max(86400000,(endMs-startMs)*0.04);
        if(visibleStart<startMs-threshold)onBoundaryNavigateRef.current('previous');
        else if(visibleEnd>endMs+threshold)onBoundaryNavigateRef.current('next');
      });
      instance.on('click',properties=>{
        if(properties?.what!=='item'&&onTimeClickRef.current&&properties?.time){
          const time=properties.time instanceof Date?properties.time:new Date(properties.time);
          if(!Number.isNaN(time.getTime())){
            const year=time.getFullYear();
            const month=String(time.getMonth()+1).padStart(2,'0');
            const day=String(time.getDate()).padStart(2,'0');
            onTimeClickRef.current(year+'-'+month+'-'+day);
            return;
          }
        }
        if(!onBoundaryNavigateRef.current||properties?.what==='item')return;
        const startMs=Date.parse(boundaryStart||windowStart||'');
        const endMs=Date.parse(boundaryEnd||windowEnd||'');
        const clickMs=properties?.time instanceof Date?properties.time.getTime():Date.parse(properties?.time||'');
        if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||!Number.isFinite(clickMs)||endMs<=startMs)return;
        const threshold=Math.max(86400000,(endMs-startMs)*0.08);
        if(clickMs<=startMs+threshold)onBoundaryNavigateRef.current('previous');
        else if(clickMs>=endMs-threshold)onBoundaryNavigateRef.current('next');
      });
      if(windowStart&&windowEnd&&Number.isFinite(Date.parse(windowStart))&&Number.isFinite(Date.parse(windowEnd))){
        instance.setWindow(windowStart,windowEnd,{animation:false});
      }else{
        instance.fit({animation:false});
      }
      setReady(true);
    }catch{
      if(!cancelled){setReady(false);setChartError(true);}
    }
    return()=>{cancelled=true;if(instance)instance.destroy();};
  },[rows,timelineMinHeight,timelineMaxHeight,mode,windowStart,windowEnd,boundaryStart,boundaryEnd,fixedMin,fixedMax,hiddenDates]);

  if(!rows.length)return <div className='scope-period-timeline-wrap scope-period-timeline-empty'><div className='scope-period-timeline scope-period-timeline-empty-line' role='region' aria-label='時間長河'/><p>{mode==='overview'?'尚未設定時期，目前以「所有」總覽顯示。':'目前時期尚無可顯示的時間資料。'}</p></div>;

  return <div className='scope-period-timeline-wrap'>
    {chartError?<p className='scope-status'>圖表載入失敗，以下改用清單顯示。</p>:null}
    <div ref={containerRef} className='scope-period-timeline' role='region' aria-label={mode==='overview'?'所有時期與定錨點時間長河':'時間長河'} style={{'--scope-period-timeline-min-height':timelineMinHeight+'px'}}/>
    {chartError?<ol className='scope-list'>
      {fallbackRows.map(row=><li key={row.id}><strong>{row.content}</strong>{row.group?<span> · {groupLabel(row.group)}</span>:null}<span> · {dateLabel(row.start)}</span>{row.title?<p>{row.title}</p>:null}</li>)}
    </ol>:null}
  </div>;
}
