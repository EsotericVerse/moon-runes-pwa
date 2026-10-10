'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {DataSet,Timeline} from 'vis-timeline/standalone';
import {densityStyleForCount,densityStyleForRatio,formatCultureDateTime} from './culture-timeline-model.mjs';

// Stable defaults matter: an inline [] or {} used as a hook dependency
// would destroy and recreate vis-timeline after setReady() on each render.
const EMPTY_ITEMS=Object.freeze([]);
const EMPTY_FOCUS=Object.freeze({});
const EMPTY_HIDDEN_DATES=Object.freeze([]);
function defaultTimelineLabel(item,index){
  return item?.display_label||item?.name||item?.title||item?.period||'項目 '+(index+1);
}

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
    const group=item?.group_key||item?.group_label||item?.scope_id||'';
    const groupContent=item?.group_label||group;
    const groupOrder=Number.isFinite(Number(item?.group_order))?Number(item.group_order):null;
    const ratio=densityRatio;
    const density=ratio>0?densityStyleForRatio(ratio):densityStyleForCount(item?.item_count);
    const classes=[
      String(item?.className||item?.class_name||'').trim(),
      focused?'scope-period-timeline-focus':'',
      density?'scope-period-density':''
    ].filter(Boolean).join(' ');
    const densityStyle=density
      ?'--culture-density:'+Math.max(.08,Math.min(1,ratio||Math.min(1,Number(item?.item_count||0)/100)))+';height:'+(8+Math.round(Math.max(.08,Math.min(1,ratio||0))*20))+'px;background:color-mix(in srgb,var(--loc-accent) '+Math.round((.12+density.glow*.72)*100)+'%,var(--loc-panel));border-color:color-mix(in srgb,var(--loc-accent) '+Math.round((.36+density.glow*.56)*100)+'%,var(--loc-line));color:var(--loc-text);filter:brightness('+density.brightness+');box-shadow:0 0 '+density.blur+' color-mix(in srgb,var(--loc-accent) '+Math.round(density.glow*100)+'%,transparent);'
      :'';
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
      resourceId:String(item?.resource_id||''),
      scopeId:String(item?.scope_id||''),
      entryType:String(item?.entry_type||''),
      period:String(item?.period||''),
      runeCount:Number(item?.rune_count||0),
      workCount:Number(item?.item_count||0),
      status:String(item?.status||''),
      openStart,openEnd,
      raw:item,
      ...(group?{group:String(group),groupContent:String(groupContent),groupOrder}:{}),
      ...(end?{end,type:'range'}:{type:'point'}),
      ...(classes?{className:classes}:{}),
      ...((densityStyle||item?.style)?{style:String(item?.style||'')+densityStyle}:{})
    }];
  });
}

function groupLabel(id){return String(id||'');}
function dateLabel(value){
  const formatted=formatCultureDateTime(value);
  return formatted.length>=10?formatted.slice(0,10):formatted;
}
function settle(handler,item,row,callback,defaultValue=null){
  if(!handler){callback(defaultValue);return;}
  Promise.resolve(handler(item,row)).then(result=>{
    if(result===true)callback(item);
    else callback(result||null);
  }).catch(()=>callback(null));
}

export default function CultureTimeline({
  items=EMPTY_ITEMS,
  labelOf=defaultTimelineLabel,
  focus=EMPTY_FOCUS,
  mode='period',
  onSelect=null,
  onTimeClick=null,
  editable=false,
  onAdd=null,
  onMove=null,
  onUpdate=null,
  onRemove=null,
  windowStart='',
  windowEnd='',
  boundaryStart='',
  boundaryEnd='',
  onBoundaryNavigate=null,
  fixedMin='',
  fixedMax='',
  hiddenDates=EMPTY_HIDDEN_DATES
}){
  const containerRef=useRef(null);
  const timelineRef=useRef(null);
  const [selectedRowId,setSelectedRowId]=useState('');
  const onSelectRef=useRef(onSelect);
  const onTimeClickRef=useRef(onTimeClick);
  const onBoundaryNavigateRef=useRef(onBoundaryNavigate);
  const onAddRef=useRef(onAdd);
  const onMoveRef=useRef(onMove);
  const onUpdateRef=useRef(onUpdate);
  const onRemoveRef=useRef(onRemove);
  const [ready,setReady]=useState(false);
  const [chartError,setChartError]=useState(false);
  const rows=useMemo(()=>timelineRows(items,labelOf,focus),[items,labelOf,focus]);
  const fallbackRows=useMemo(()=>[...rows].sort((a,b)=>String(b.start).localeCompare(String(a.start))),[rows]);
  const hasTimeKinds=mode==='overview'&&rows.some(row=>String(row.group||'').startsWith('kind:'));
  const groupCount=Math.max(new Set(rows.map(row=>row.group).filter(Boolean)).size,hasTimeKinds?4:0);
  const compactGroupCount=Math.max(1,groupCount||rows.length);
  const timelineMinHeight=Math.max(180,96+compactGroupCount*46);
  const timelineMaxHeight=Math.max(360,Math.min(760,180+compactGroupCount*92));

  useEffect(()=>{onSelectRef.current=onSelect},[onSelect]);
  useEffect(()=>{onTimeClickRef.current=onTimeClick},[onTimeClick]);
  useEffect(()=>{onBoundaryNavigateRef.current=onBoundaryNavigate},[onBoundaryNavigate]);
  useEffect(()=>{onAddRef.current=onAdd},[onAdd]);
  useEffect(()=>{onMoveRef.current=onMove},[onMove]);
  useEffect(()=>{onUpdateRef.current=onUpdate},[onUpdate]);
  useEffect(()=>{onRemoveRef.current=onRemove},[onRemove]);

  useEffect(()=>{
    let cancelled=false;
    let instance=null;
    let initialPanWindow=null;
    let boundaryChangeSent=false;
    timelineRef.current=null;
    setChartError(false);
    if(!containerRef.current||!rows.length){setReady(false);return()=>{cancelled=true};}
    setReady(false);
    try{
      if(cancelled||!containerRef.current)return()=>{cancelled=true};
      const dataRows=rows.map(row=>editable?{
        ...row,
        editable:{
          updateTime:row.entryType==='anchor',
          updateGroup:false,
          remove:Boolean(row.recordId)
        }
      }:row);
      const data=new DataSet(dataRows);
      const timeGroupLabels={anchor:'定錨點',event:'事件',style_comment:'風格標籤',period:'時期'};
      const standardTimeKinds=Object.keys(timeGroupLabels);
      const foundGroups=[...new Set(rows.map(row=>row.group).filter(Boolean))];
      const groupIds=hasTimeKinds
        ?[...standardTimeKinds.map(kind=>'kind:'+kind),...foundGroups.filter(id=>!String(id).startsWith('kind:'))]
        :foundGroups;
      const groups=groupIds.length?new DataSet(groupIds.map((id,index)=>{
        const members=rows.filter(row=>row.group===id);
        const explicit=members.map(row=>row.groupOrder).filter(Number.isFinite);
        const kind=String(id).startsWith('kind:')?String(id).slice(5):'';
        const defaultOrder=standardTimeKinds.indexOf(kind);
        return {
          id,
          content:members.find(row=>row.groupContent)?.groupContent||timeGroupLabels[kind]||groupLabel(id),
          order:explicit.length?Math.min(...explicit):defaultOrder>=0?defaultOrder:100+index
        };
      })):null;
      const rowById=id=>dataRows.find(row=>row.id===String(id))||null;
      // Supply the selected camera range at construction time. Otherwise the
      // timeline may auto-fit all periods during its first layout after an
      // immediate setWindow(), making a chosen period appear to snap back.
      const hasSelectedWindow=Boolean(windowStart&&windowEnd&&
        Number.isFinite(Date.parse(windowStart))&&
        Number.isFinite(Date.parse(windowEnd))&&
        Date.parse(windowEnd)>=Date.parse(windowStart));
      instance=new Timeline(containerRef.current,data,groups,{
        ...(hasSelectedWindow?{start:windowStart,end:windowEnd}:{}),
        autoResize:true,
        minHeight:timelineMinHeight+'px',
        maxHeight:timelineMaxHeight+'px',
        verticalScroll:true,
        groupOrder:'order',
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
            millisecond:'SSS',second:'s秒',minute:'HH:mm',hour:'HH:mm',weekday:'M/D',day:'M/D',week:'M/D',month:'M月',year:'YYYY'
          },
          majorLabels:{
            millisecond:'YYYY/M/D HH:mm:ss',second:'YYYY/M/D HH:mm',minute:'YYYY/M/D',hour:'YYYY/M/D',weekday:'YYYY/M',day:'YYYY/M',week:'YYYY/M',month:'YYYY年',year:''
          }
        },
        // Wheel/pinch zoom and dragging must not require Ctrl, Alt, or other keys.
        horizontalScroll:false,
        zoomable:true,
        zoomKey:'',
        zoomMin:1000*60*60*24*14,
        zoomMax:1000*60*60*24*365*50,
        ...(Array.isArray(hiddenDates)&&hiddenDates.length?{hiddenDates}:{}),
        ...(fixedMin&&Number.isFinite(Date.parse(fixedMin))?{min:fixedMin}:{}),
        ...(fixedMax&&Number.isFinite(Date.parse(fixedMax))?{max:fixedMax}:{}),
        selectable:true,
        moveable:true,
        editable:editable?{add:Boolean(onAddRef.current),updateTime:true,updateGroup:false,remove:true,overrideItems:false}:false,
        ...(editable?{
          ...(onAddRef.current?{onAdd:(item,callback)=>settle(onAddRef.current,item,null,callback,null)}:{}),
          onMove:(item,callback)=>settle(onMoveRef.current,item,rowById(item.id),callback,null),
          onUpdate:(item,callback)=>settle(onUpdateRef.current,item,rowById(item.id),callback,null),
          onRemove:(item,callback)=>settle(onRemoveRef.current,item,rowById(item.id),callback,null)
        }:{}),
        showCurrentTime:false,
        stack:mode!=='source',
        margin:mode==='source'
          ?{axis:10,item:{horizontal:3,vertical:5}}
          :{item:{horizontal:8,vertical:12}}
      });
      timelineRef.current=instance;
      instance.on('select',({items:selectedItems=[]})=>{
        const row=rowById(selectedItems[0]);
        setSelectedRowId(row?.id||'');
        onSelectRef.current?.(row);
      });
      instance.on('rangechanged',properties=>{
        // Only a real user pan can advance the selected period. A click or a
        // ctrl+wheel zoom must not change periods.
        if(!onBoundaryNavigateRef.current||fixedMin||fixedMax||properties?.byUser!==true||!initialPanWindow||boundaryChangeSent)return;
        const startMs=Date.parse(boundaryStart||windowStart||'');
        const endMs=Date.parse(boundaryEnd||windowEnd||'');
        const visibleStart=properties?.start instanceof Date?properties.start.getTime():Date.parse(properties?.start||'');
        const visibleEnd=properties?.end instanceof Date?properties.end.getTime():Date.parse(properties?.end||'');
        const initialStart=initialPanWindow.start.getTime();
        const initialEnd=initialPanWindow.end.getTime();
        const initialSpan=initialEnd-initialStart;
        const visibleSpan=visibleEnd-visibleStart;
        if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||!Number.isFinite(visibleStart)||!Number.isFinite(visibleEnd)||initialSpan<=0||endMs<=startMs)return;
        if(Math.abs(visibleSpan-initialSpan)>Math.max(86400000,initialSpan*0.03))return;
        const shift=(visibleStart+visibleEnd-initialStart-initialEnd)/2;
        const threshold=Math.max(86400000,initialSpan*0.04);
        if(shift< -threshold&&visibleStart<startMs-threshold){
          boundaryChangeSent=true;
          onBoundaryNavigateRef.current('previous');
        }else if(shift>threshold&&visibleEnd>endMs+threshold){
          boundaryChangeSent=true;
          onBoundaryNavigateRef.current('next');
        }
      });
      // vis-timeline handles mouse double-click and touch double-tap here.
      // A single tap only selects; only an authorized caller may create an anchor.
      instance.on('doubleClick',properties=>{
        if(!onTimeClickRef.current)return;
        if(properties?.what!=='background'&&properties?.what!=='axis')return;
        const time=properties.time instanceof Date?properties.time:new Date(properties.time||'');
        if(Number.isNaN(time.getTime()))return;
        const year=time.getFullYear();
        const month=String(time.getMonth()+1).padStart(2,'0');
        const day=String(time.getDate()).padStart(2,'0');
        onTimeClickRef.current(year+'-'+month+'-'+day);
      });
      if(hasSelectedWindow){
        instance.setWindow(windowStart,windowEnd,{animation:false});
      }else{
        instance.fit({animation:false});
      }
      initialPanWindow=instance.getWindow();
      setReady(true);
    }catch{
      if(!cancelled){setReady(false);setChartError(true);}
    }
    return()=>{
      cancelled=true;
      if(timelineRef.current===instance)timelineRef.current=null;
      if(instance)instance.destroy();
    };
  },[rows,hasTimeKinds,timelineMinHeight,timelineMaxHeight,mode,windowStart,windowEnd,boundaryStart,boundaryEnd,fixedMin,fixedMax,hiddenDates,editable]);

  // Explicit alternatives to gestures, available on touch, mouse, and keyboard.
  function changeWindow(action){
    const timeline=timelineRef.current;
    if(!timeline)return;
    if(action==='zoom-in')return timeline.zoomIn(.35,{animation:false});
    if(action==='zoom-out')return timeline.zoomOut(.35,{animation:false});
    if(action==='reset'){
      if(windowStart&&windowEnd&&Number.isFinite(Date.parse(windowStart))&&Number.isFinite(Date.parse(windowEnd))){
        return timeline.setWindow(windowStart,windowEnd,{animation:false});
      }
      return timeline.fit({animation:false});
    }
    const {start,end}=timeline.getWindow();
    const from=start.getTime(),to=end.getTime();
    if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return;
    const shift=(to-from)*.35*(action==='later'?1:-1);
    timeline.setWindow(new Date(from+shift),new Date(to+shift),{animation:false});
  }
  function selectFromList(event){
    const row=rows.find(item=>item.id===event.target.value)||null;
    setSelectedRowId(row?.id||'');
    if(row)timelineRef.current?.setSelection([row.id],{focus:true,animation:false});
    onSelectRef.current?.(row);
  }

  if(!rows.length)return <div className='scope-period-timeline-wrap scope-period-timeline-empty'><div className='scope-period-timeline scope-period-timeline-empty-line' role='region' aria-label='時間長河'/><p>{mode==='overview'?'尚未設定時期，目前以「所有」總覽顯示。':'目前時期尚無可顯示的時間資料。'}</p></div>;

  return <div className='scope-period-timeline-wrap'>
    <div className='scope-timeline-controls' role='group' aria-label='時間長河操作'>
      <button type='button' className='loc-button' aria-label='往較早時間移動' disabled={!ready} onClick={()=>changeWindow('earlier')}>←</button>
      <button type='button' className='loc-button' aria-label='往較晚時間移動' disabled={!ready} onClick={()=>changeWindow('later')}>→</button>
      <button type='button' className='loc-button' aria-label='放大時間長河' disabled={!ready} onClick={()=>changeWindow('zoom-in')}>＋</button>
      <button type='button' className='loc-button' aria-label='縮小時間長河' disabled={!ready} onClick={()=>changeWindow('zoom-out')}>－</button>
      <button type='button' className='loc-button' aria-label='重置時間長河視野' disabled={!ready} onClick={()=>changeWindow('reset')}>重置</button>
    </div>
    {onSelect&&mode==='overview'&&rows.length<=250?<label className='scope-timeline-item-picker'>
      <span>選擇河道紀錄</span>
      <select className='scope-select' aria-label='選擇河道紀錄' value={rows.some(row=>row.id===selectedRowId)?selectedRowId:''} onChange={selectFromList}>
        <option value=''>請選擇日期或紀錄</option>
        {rows.map(row=><option key={row.id} value={row.id}>{String(row.start||'').slice(0,10)} · {row.content||row.title||row.entryType||'紀錄'}</option>)}
      </select>
    </label>:null}
    {chartError?<p className='scope-status'>圖表載入失敗，以下改用清單顯示。</p>:null}
    <div ref={containerRef} data-anchor-gesture={onTimeClick?'double-tap':'none'} className='scope-period-timeline' role='region' aria-label={mode==='overview'?'所有時期與定錨點時間長河':'時間長河'} style={{'--scope-period-timeline-min-height':timelineMinHeight+'px'}}/>
    {chartError?<ol className='scope-list'>
      {fallbackRows.map(row=><li key={row.id}><strong>{row.content}</strong>{row.group?<span> · {groupLabel(row.group)}</span>:null}<span> · {dateLabel(row.start)}</span>{row.title?<p>{row.title}</p>:null}</li>)}
    </ol>:null}
  </div>;
}
