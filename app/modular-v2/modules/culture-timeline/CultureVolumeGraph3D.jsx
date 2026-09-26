'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

function escapeHtml(value){return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');}
function displayDate(value){
  if(!value)return '';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?String(value).slice(0,10):new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function externalSourceHref(work){
  const value=String(work?.url||work?.media_link||work?.source_ref||'').trim();
  return /^https?:\/\//i.test(value)?value:'';
}
function dateInput(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return date.toISOString().slice(0,10);
}

export default function CultureVolumeGraph3D({
  periods=[],timelineItems=[],categories=[],selectedCategory='',works=[],workPage=0,workPageCount=1,
  selectedCategoryType='',loading=false,categoryLoading=false,categoryError='',workLoading=false,workError='',error='',canEdit=false,
  onSelectCategory=()=>{},onPageChange=()=>{},onSelectWorkPoint=()=>{},onSelectTimelineEntry=()=>{},onCommand=()=>{}
}){
  const containerRef=useRef(null);
  const pointActionsRef=useRef(new Map());
  const [graphError,setGraphError]=useState('');
  const [tool,setTool]=useState('view');
  const [anchorPair,setAnchorPair]=useState([]);
  const [message,setMessage]=useState('');

  const sourceNames=useMemo(()=>[...new Set(periods.flatMap(group=>(group.sources||[]).map(source=>source.display_label||source.source_platform)))].sort((a,b)=>a.localeCompare(b)),[periods]);
  const selectedCategoryInfo=useMemo(()=>categories.find(row=>row.category_key===selectedCategory)||null,[categories,selectedCategory]);
  const selectedCategoryLabel=selectedCategoryInfo?.display_label||selectedCategoryInfo?.source_platform||selectedCategory;
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
      if(!Number.isFinite(time))continue;
      for(const source of periodEntry.sources||[]){
        const categoryLabel=source.display_label||source.source_platform;
        const categoryKey=source.category_key||source.source_platform;
        const sourceIndex=sourceNames.indexOf(categoryLabel);
        const id='work:'+String(period.period||period.start_date)+':'+categoryKey;
        const count=Number(source.item_count)||0;
        const countLabel=source.category_type==='media'?'筆多媒體':'項作品';
        data.push({
          id,x:time,y:sourceIndex+1,z:count,style:Math.max(1,count),
          title:escapeHtml((period.display_label||period.title||period.period||'時期')+' · '+categoryLabel+' · '+count.toLocaleString()+' '+countLabel)
        });
        actions.set(id,{kind:'work',period,category_key:categoryKey,category_type:source.category_type,source_platform:source.source_platform,item_count:count});
      }
      const periodId='period:'+String(period.entry_key||period.period||time);
      data.push({id:periodId,x:time,y:0,z:0,style:18,title:escapeHtml((period.display_label||period.title||period.period||'時期')+' · 時期起點')});
      actions.set(periodId,{kind:'period',period});
    }

    for(const row of timelineItems){
      if(row.scope_id!=='lo3rwang'||!['anchor','event','style'].includes(row.entry_type))continue;
      const start=Date.parse(row.start_date||row.date||'');
      if(!Number.isFinite(start))continue;
      const end=Date.parse(row.end_date||'');
      const x=row.entry_type!=='anchor'&&Number.isFinite(end)?(start+end)/2:start;
      const lane=row.entry_type==='anchor'?-0.18:row.entry_type==='event'?-0.38:-0.58;
      const id='entry:'+String(row.entry_id||row.id||row.entry_key||x);
      data.push({
        id,x,y:lane,z:0,style:row.entry_type==='anchor'?20:14,
        title:escapeHtml((row.entry_type==='anchor'?'定錨點':row.entry_type==='event'?'事件':'風格')+' · '+(row.display_label||row.title||'')+' · '+displayDate(row.start_date||row.date))
      });
      actions.set(id,{kind:'entry',row});
    }
    if(canEdit&&tool==='anchor'&&data.length){
      const times=data.map(point=>Number(point.x)).filter(Number.isFinite);
      const min=Math.min(...times),max=Math.max(...times);
      const day=86400000;
      const span=Math.max(day,max-min);
      const stepDays=Math.max(1,Math.ceil(span/day/1800));
      const first=Math.floor(min/day)*day;
      const last=Math.ceil(max/day)*day;
      for(let time=first;time<=last;time+=stepDays*day){
        const id='date-slot:'+time;
        data.push({id,x:time,y:-0.02,z:0,style:1,title:escapeHtml('定錨日期 · '+displayDate(time))});
        actions.set(id,{kind:'date-slot',date:dateInput(time)});
      }
    }
    pointActionsRef.current=actions;
    return data;
  },[periods,timelineItems,sourceNames,canEdit,tool]);

  useEffect(()=>{
    let cancelled=false;
    let graph=null;
    let resizeObserver=null;
    setGraphError('');
    if(loading||!containerRef.current)return()=>{cancelled=true};
    if(!graphPoints.length){setGraphError('目前沒有可呈現的時期或作品來源資料。');return()=>{cancelled=true};}
    import('vis-graph3d/standalone').then(({Graph3d})=>{
      if(cancelled||!containerRef.current)return;
      const xMin=Math.min(...graphPoints.map(point=>point.x));
      const xMax=Math.max(...graphPoints.map(point=>point.x));
      graph=new Graph3d(containerRef.current,graphPoints,{
        width:'100%',height:'540px',style:'dot-size',showLegend:false,
        showPerspective:true,showGrid:true,keepAspectRatio:true,
        xLabel:'時間',yLabel:'來源',zLabel:'作品量',
        xMin,xMax:xMax===xMin?xMax+86400000:xMax,
        yMin:-1,yMax:Math.max(3,...graphPoints.map(point=>point.y)),
        zMin:0,tooltip:true,verticalRatio:0.8,
        xValueLabel:value=>displayDate(value),
        yValueLabel:value=>value===0?'時期／定錨點':value<0?'事件／風格':(sourceNames[Math.round(value)-1]||''),
        zValueLabel:value=>Number(value).toLocaleString()
      });
      graph.on('click',point=>{
        const action=point?.id?pointActionsRef.current.get(String(point.id)):null;
        if(canEdit&&tool==='anchor'){
          const x=Number(point?.x);
          const date=action?.kind==='date-slot'?action.date:action?.kind==='period'?action.period.start_date:(Number.isFinite(x)?dateInput(x):'');
          if(!date)return;
          onCommand({scopeId:'lo3rwang',type:'anchor',values:{start_date:date}});
          setMessage('已在時間長河所選日期新增定錨點草稿。');
          setTool('view');
          return;
        }
        if(!action)return;
        if(canEdit&&['event','period','style'].includes(tool)){
          if(action.kind!=='entry'||action.row.entry_type!=='anchor'||!action.row.anchor_id)return;
          const next=[...anchorPair,action.row].slice(-2);
          if(next.length===2){
            const before=String(next[0].start_date)<=String(next[1].start_date)?next[0]:next[1];
            const after=before===next[0]?next[1]:next[0];
            const type=tool;
            const values=type==='event'
              ?{before_id:before.anchor_id,after_id:after.anchor_id}
              :{start_anchor_id:before.anchor_id,end_anchor_id:after.anchor_id};
            onCommand({scopeId:'lo3rwang',type,values});
            setAnchorPair([]);
            setMessage(type==='event'?'已選定事件前後定錨點。':type==='style'?'已選定風格起訖定錨點。':'已選定時期起訖定錨點。');
            setTool('view');
          }else{
            setAnchorPair(next);
            setMessage('已選第一個定錨點，請再選第二個。');
          }
          return;
        }
        if(action.kind==='work'){
          onSelectWorkPoint(action);
          onSelectCategory(action.category_key||action.source_platform);
        }else if(action.kind==='entry')onSelectTimelineEntry(action.row);
        else if(action.kind==='period')onSelectTimelineEntry(action.period);
      });
      resizeObserver=new ResizeObserver(()=>graph?.redraw());
      resizeObserver.observe(containerRef.current);
    }).catch(()=>{if(!cancelled)setGraphError('3D 河道載入失敗。');});
    return()=>{
      cancelled=true;
      resizeObserver?.disconnect();
      if(graph){graph.off?.('click');graph.destroy?.();}
      if(containerRef.current)containerRef.current.innerHTML='';
    };
  },[graphPoints,loading,canEdit,tool,anchorPair,onCommand,onSelectWorkPoint,onSelectCategory,onSelectTimelineEntry,sourceNames]);

  const startDrag=(event,anchor)=>event.dataTransfer.setData('text/plain',anchor.anchor_id);
  const dropEvent=(event,target)=>{
    event.preventDefault();
    const dragged=event.dataTransfer.getData('text/plain');
    if(!dragged||dragged===target.anchor_id)return;
    const first=authorAnchors.find(anchor=>anchor.anchor_id===dragged);
    if(!first)return;
    const ordered=[first,target].sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
    onCommand({scopeId:'lo3rwang',type:'event',values:{before_id:ordered[0].anchor_id,after_id:ordered[1].anchor_id}});
    setMessage('已建立事件草稿，請補上名稱與說明後儲存。');
  };
  const chooseRange=(anchor,type)=>{
    const next=[...anchorPair,anchor].slice(-2);
    if(next.length===2){
      const ordered=[...next].sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
      const values={start_anchor_id:ordered[0].anchor_id,end_anchor_id:ordered[1].anchor_id};
      onCommand({scopeId:'lo3rwang',type,values});
      setAnchorPair([]);
      setTool('view');
      setMessage(type==='style'?'已選定風格起訖定錨點。':'已選定時期起訖定錨點。');
    }else{
      setAnchorPair(next);
      setMessage(type==='style'?'已選風格起點，請再選終點。':'已選時期起點，請再選終點。');
    }
  };

  return <section className='scope-v2-card scope-v2-culture-3d'>
    <header className='scope-v2-culture-3d-heading'>
      <div><h3>時期 × 來源 × 作品量</h3><p>X＝時間、Y＝來源、Z＝作品量。選取來源只展開同一時間座標下的標題＋日期列表，不再切換成頁內順序的假 3D。</p></div>
      <span>3D</span>
    </header>
    <section className='scope-v2-culture-3d-categories' aria-label='作品與多媒體分類'>
      <h4>作品與多媒體分類</h4>
      {categoryLoading?<p className='scope-v2-status'>載入作品與多媒體分類…</p>:null}
      {categoryError?<p className='scope-v2-status scope-v2-error'>{categoryError}</p>:null}
      {!categoryLoading&&!categoryError&&!categories.length?<p className='scope-v2-status'>目前沒有作品或多媒體項目。</p>:null}
      {categories.length?<div className='scope-v2-culture-3d-category-list'>
        {categories.map(category=>{
          const categoryKey=category.category_key||category.source_platform;
          const isMedia=category.category_type==='media';
          return <button key={categoryKey} type='button'
            aria-pressed={selectedCategory===categoryKey}
            onClick={()=>{onSelectCategory(selectedCategory===categoryKey?'':categoryKey);setTool('view');setMessage('')}}>
            <strong>{category.display_label||category.source_platform}</strong><span>{Number(category.item_count||0).toLocaleString()} {isMedia?'筆多媒體':'項作品'}</span>
          </button>;
        })}
      </div>:null}
    </section>
    {canEdit?<div className='scope-v2-tabs scope-v2-culture-3d-tools' aria-label='時期河道編輯工具'>
      <button type='button' aria-pressed={tool==='view'} onClick={()=>{setTool('view');setAnchorPair([]);setMessage('')}}>瀏覽／旋轉</button>
      <button type='button' aria-pressed={tool==='anchor'} onClick={()=>{setTool('anchor');setAnchorPair([]);setMessage('直接點擊時間長河上的日期位置，建立該日期的定錨點草稿。')}}>在時期河道新增定錨點</button>
      <button type='button' aria-pressed={tool==='event'} onClick={()=>{setTool('event');setAnchorPair([]);setMessage('點兩個定錨點，或將下方一個定錨點拖到另一個。')}}>建立事件</button>
      <button type='button' aria-pressed={tool==='period'} onClick={()=>{setTool('period');setAnchorPair([]);setMessage('依序點選時期河道上的前後定錨點。')}}>設定時期前後</button>
      <button type='button' aria-pressed={tool==='style'} onClick={()=>{setTool('style');setAnchorPair([]);setMessage('依序點選時期河道上的風格起點與終點。')}}>設定風格區間</button>
    </div>:null}
    {loading?<p className='scope-v2-status'>載入時期與來源作品量…</p>:null}
    {error?<p className='scope-v2-status scope-v2-error'>{error}</p>:null}
    {graphError?<p className='scope-v2-status'>{graphError}</p>:null}
    <div ref={containerRef} className='scope-v2-culture-3d-canvas' role='img' aria-label='X 軸時間、Y 軸來源、Z 軸作品量的 3D 河道'/>
    {canEdit&&authorAnchors.length?<div className='scope-v2-culture-3d-anchor-rail' aria-label='時期河道定錨點；拖曳兩點可建立事件'>
      <strong>時期河道定錨點（拖曳建立事件）</strong>
      {authorAnchors.map(anchor=><button key={anchor.anchor_id} type='button' draggable
        onDragStart={event=>startDrag(event,anchor)}
        onDragOver={event=>event.preventDefault()}
        onDrop={event=>dropEvent(event,anchor)}
        onClick={()=>{if(tool==='period'||tool==='style')chooseRange(anchor,tool);}}>
        {displayDate(anchor.start_date)} · {anchor.title||anchor.anchor_id}
      </button>)}
    </div>:null}
    {message?<p className='scope-v2-status' role='status'>{message}</p>:null}

    {selectedCategory?<div className='scope-v2-culture-3d-drilldown'>
      <div className='scope-v2-culture-3d-drilldown-heading'>
        <div><strong>{selectedCategoryLabel||'作品或多媒體分類'}</strong><span>{(Number(selectedCategoryInfo?.item_count)||0).toLocaleString()} {selectedCategoryType==='media'?'筆多媒體':'項作品'}</span></div>
        <button type='button' className='scope-v2-pagination-button' onClick={()=>onSelectCategory('')}>收合列表</button>
      </div>
      {workLoading?<p className='scope-v2-status'>載入{selectedCategoryType==='media'?'多媒體':'作品'}第 {workPage+1} 頁…</p>:null}
      {workError?<p className='scope-v2-status scope-v2-error'>{workError}</p>:null}
      <div className='scope-v2-culture-3d-work-river' aria-label={selectedCategoryLabel+'標題與日期列表'}>
        {works.map((work,index)=><article className='scope-v2-culture-3d-work' key={work.media_id||work.galaxy_id||work.work_id||work.source_id||String(work.created_at)+'-'+index}>
          <time>{work.display_date||displayDate(work.created_at)}</time>
          <strong>{work.title||work.work_id||'未命名作品'}</strong>
          {externalSourceHref(work)?<a href={externalSourceHref(work)} target='_blank' rel='noreferrer'>查看來源</a>:null}
        </article>)}
      </div>
      {!workLoading&&!workError&&!works.length?<p className='scope-v2-status'>{selectedCategoryType==='media'?'這個時期目前沒有多媒體項目。':'這個分類目前沒有作品。'}</p>:null}
      <nav className='scope-v2-culture-3d-pages' aria-label={selectedCategoryType==='media'?'多媒體分頁':'作品分頁'}>
        <button type='button' disabled={workPage<=0||workLoading} onClick={()=>onPageChange(Math.max(0,workPage-1))}>上一頁</button>
        <span>第 {workPage+1} / {Math.max(1,workPageCount)} 頁</span>
        <button type='button' disabled={workPage+1>=workPageCount||workLoading} onClick={()=>onPageChange(Math.min(workPageCount-1,workPage+1))}>下一頁</button>
      </nav>
    </div>:null}
  </section>;
}
