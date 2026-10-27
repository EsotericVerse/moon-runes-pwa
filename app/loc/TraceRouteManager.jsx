'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import Select from 'react-select';
import {useSearchParams} from 'next/navigation';
import {useAccount} from './use-account';
import {useEditDockForm} from '../modular/edit-dock';
import {useAsyncResource,useResourceCache} from './use-async-resource';
import {
  TRACE_SCOPES,traceMapIndexKey,traceCurrentKey,traceAllAnchorsKey,
  traceMemberUids,readTraceMapIndex,readCurrentTraceAnchors,readAllTraceAnchors,
  addTraceMap,updateTraceMap,deleteTraceMap
} from '../modular/features/trace/trace-data';
import {
  readDefaultTraceRoute,setDefaultTraceRoute,clearDefaultTraceRoute,chooseDefaultTraceRoute
} from '../modular/features/trace/trace-route-preference.mjs';

const TraceMap=dynamic(()=>import('../modular/features/trace/TraceMap'),{
  ssr:false,loading:()=> <p className="scope-status">正在載入地圖…</p>
});
const MAX_ROAD=80,MAX_LINES=400;
const unique=items=>[...new Set(items)];
const validPair=pair=>Array.isArray(pair)&&pair.length===2&&pair[0]&&pair[1]&&pair[0]!==pair[1];

export default function TraceRouteManager({scopeId}){
  const account=useAccount(),cache=useResourceCache(),params=useSearchParams();
  const [owner,setOwner]=useState(scopeId);
  const [selectedUid,setSelectedUid]=useState('');
  const [editorOpen,setEditorOpen]=useState(false);
  const [editingUid,setEditingUid]=useState('');
  const [type,setType]=useState('space_period');
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [filter,setFilter]=useState('');
  const [spool,setSpool]=useState([]);
  const [queue,setQueue]=useState([]);
  const [pairs,setPairs]=useState([]);
  const [selectedAnchor,setSelectedAnchor]=useState(null);
  const [selectedStop,setSelectedStop]=useState('');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [mapStart,setMapStart]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState(false);
  const [showMap,setShowMap]=useState(false);
  const [savedReceipt,setSavedReceipt]=useState(null);
  const openedFromUrl=useRef('');
  const own=owner!=='loc'&&account.canManageScopeSync(owner);
  const index=useAsyncResource({
    queryKey:traceMapIndexKey(scopeId),
    enabled:TRACE_SCOPES.includes(scopeId),
    queryFn:()=>readTraceMapIndex(scopeId),
    revalidateIfStale:false,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const records=(index.data||[]).filter(row=>row.source_scope===owner);
  const visibleRecords=records.filter(row=>row.title.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()));
  const current=records.find(row=>row.uid===selectedUid)
    ||chooseDefaultTraceRoute(records,owner,readDefaultTraceRoute(owner));
  const anchorIndex=useAsyncResource({
    queryKey:traceAllAnchorsKey(owner,{nativeOnly:owner==='loc'}),
    enabled:editorOpen,
    queryFn:()=>readAllTraceAnchors(owner,{nativeOnly:owner==='loc'}),
    revalidateIfStale:false,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const currentAnchors=useAsyncResource({
    queryKey:current?traceCurrentKey(owner,current,{nativeOnly:owner==='loc'}):null,
    enabled:Boolean(current)&&!editorOpen,
    queryFn:()=>readCurrentTraceAnchors(owner,current.anchor_list,{nativeOnly:owner==='loc'}),
    revalidateIfStale:false,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const allAnchors=anchorIndex.data||[];
  const anchorMap=useMemo(()=>new Map(allAnchors.map(a=>[a.uid,a])),[allAnchors]);
  const options=useMemo(()=>allAnchors.map(row=>({value:row.uid,label:row.title+' · '+row.uid})),[allAnchors]);
  const poolOptions=useMemo(()=>spool.map(uid=>anchorMap.get(uid))
    .filter(Boolean).map(row=>({value:row.uid,label:row.title+' · '+row.uid})),[spool,anchorMap]);
  const availableRoadOptions=poolOptions.filter(item=>!queue.includes(item.value));
  const incomplete=editorOpen&&Boolean(editingUid||title||description||spool.length||queue.length||pairs.length);
  const chosenIds=type==='space_period'?queue:unique(pairs.flat());
  const preview=editorOpen&&chosenIds.length>=2
    ?{uid:editingUid||'EDIT',trace_type:type,source_scope:owner,
      title:title||'地圖預覽',anchor_list:type==='space_period'?queue:pairs}:current;
  const previewAnchors=currentAnchors.data||[];
  const clear=()=>{
    setEditingUid('');setTitle('');setDescription('');setSpool([]);setQueue([]);setPairs([]);
    setFrom('');setTo('');setMapStart('');setSelectedStop('');setSelectedAnchor(null);setSavedReceipt(null);
  };
  const allowLeave=()=>!incomplete||window.confirm('尚未儲存，確定放棄修改？');
  const openNew=kind=>{
    if(busy||!allowLeave())return;
    clear();setType(kind);setEditorOpen(true);setShowMap(true);setError(false);setNotice('');
  };
  const openEdit=row=>{
    if(busy||!allowLeave())return;
    clear();setEditorOpen(true);setEditingUid(row.uid);setType(row.trace_type);
    setTitle(row.title);setDescription(row.description||'');
    setQueue(row.trace_type==='space_period'?[...row.anchor_list]:[]);
    setPairs(row.trace_type==='space_trace'?row.anchor_list.map(pair=>[...pair]):[]);
    setSpool(traceMemberUids(row));setSelectedUid(row.uid);setShowMap(true);
  };
  useEffect(()=>{
    setSelectedUid('');setEditorOpen(false);setShowMap(false);clear();
  },[owner]);
  useEffect(()=>{
    const requested=params?.get('frame')||'';
    if(!requested||!index.data||!own||editorOpen)return;
    const token=owner+':'+requested;
    if(openedFromUrl.current===token)return;
    const row=records.find(item=>item.uid===requested);
    if(row){openedFromUrl.current=token;openEdit(row);}
  },[params,index.data,owner,own]);
  const addToSpool=()=>{
    const uid=selectedAnchor?.value;
    if(!uid||spool.includes(uid))return;
    setSpool(items=>[...items,uid]);setSelectedAnchor(null);
  };
  const removeFromSpool=uid=>{
    setSpool(items=>items.filter(id=>id!==uid));
    setQueue(items=>items.filter(id=>id!==uid));
    setPairs(items=>items.filter(pair=>!pair.includes(uid)));
    if(from===uid)setFrom('');if(to===uid)setTo('');
  };
  const addRoadStop=()=>{
    if(!selectedStop||queue.includes(selectedStop)||queue.length>=MAX_ROAD)return;
    setQueue(items=>[...items,selectedStop]);setSelectedStop('');
  };
  const shift=(index,step)=>{
    setQueue(items=>{
      const target=index+step;if(target<0||target>=items.length)return items;
      const next=[...items];[next[index],next[target]]=[next[target],next[index]];return next;
    });
  };
  const addPair=()=>{
    if(!from||!to||from===to||pairs.length>=MAX_LINES)return;
    if(pairs.some(pair=>pair[0]===from&&pair[1]===to))return;
    setPairs(items=>[...items,[from,to]]);setFrom('');setTo('');
  };
  const addMapSelectedAnchor=anchor=>{
    const uid=String(anchor?.uid||'');
    if(busy||!own||!editorOpen||!anchorMap.has(uid))return;
    setSpool(items=>items.includes(uid)?items:[...items,uid]);
    if(type==='space_period'){
      setQueue(items=>items.includes(uid)||items.length>=MAX_ROAD?items:[...items,uid]);
    }else if(!mapStart){
      setMapStart(uid);
    }else if(uid!==mapStart){
      setPairs(items=>items.length>=MAX_LINES||items.some(pair=>pair[0]===mapStart&&pair[1]===uid)
        ?items:[...items,[mapStart,uid]]);
      setMapStart('');
    }
  };
  const refresh=async()=>{
    await Promise.allSettled([cache.invalidate({queryKey:traceMapIndexKey(owner)}),
      cache.invalidate({queryKey:traceMapIndexKey('loc')}),
      cache.invalidate({queryKey:['trace-current',owner]})]);
  };
  const save=async event=>{
    event?.preventDefault?.();
    if(busy||!own||!editorOpen)return false;
    setBusy(true);setNotice('');setError(false);
    try{
      if(!title.trim())throw Error('請輸入名稱');
      if(type==='space_period'&&(queue.length<2||queue.length>MAX_ROAD))
        throw Error('路線至少兩站，依先後順序建立');
      if(type==='space_trace'&&(!pairs.length||pairs.length>MAX_LINES||pairs.some(pair=>!validPair(pair))))
        throw Error('痕跡圖必須至少有一條有效的起點與終點線段');
      if(chosenIds.some(uid=>!anchorMap.has(uid)))throw Error('Spool 內有尚未載入的定錨點');
      const input={scopeId:owner,type,title,description,
        anchorUids:type==='space_period'?queue:pairs,anchors:allAnchors};
      let receipt=savedReceipt;
      if(receipt&&(receipt.type!==type||receipt.editingUid!==editingUid))
        throw Error('上一筆儲存尚未確認，不會再次新增');
      if(!receipt){
        const row=editingUid
          ?await updateTraceMap({...input,uid:editingUid}):await addTraceMap(input);
        if(!row?.uid)throw Error('資料庫沒有回傳 UID');
        receipt={uid:row.uid,type,editingUid};setSavedReceipt(receipt);
      }
      const updated=await index.mutate();
      const saved=(updated||[]).find(row=>row.uid===receipt.uid&&row.source_scope===owner);
      if(!saved||saved.title!==title.trim()||saved.trace_type!==type
        ||JSON.stringify(saved.anchor_list)!==JSON.stringify(input.anchorUids))
        throw Error('資料庫已回應寫入，但重讀尚未一致；保留草稿，按儲存只重新檢查');
      const uid=receipt.uid;
      clear();setSelectedUid(uid);setEditorOpen(false);setShowMap(true);
      await refresh();
      setNotice('已儲存並重讀確認：'+(type==='space_period'?'路線圖':'痕跡圖'));
      return true;
    }catch(e){setError(true);setNotice(String(e.message||e));return false;}
    finally{setBusy(false);}
  };
  const remove=async row=>{
    if(!own||busy||!window.confirm('刪除「'+row.title+'」？地點與 Galaxy 文章不會刪除。'))return;
    setBusy(true);setError(false);
    try{
      await deleteTraceMap({scopeId:owner,uid:row.uid,type:row.trace_type});
      await index.mutate();
      if(selectedUid===row.uid)setSelectedUid('');
      if(readDefaultTraceRoute(owner)===row.uid)clearDefaultTraceRoute(owner,row.uid);
      await refresh();setNotice('已刪除連線資料，原始地點保留');
    }catch(e){setError(true);setNotice(String(e.message||e));}finally{setBusy(false);}
  };
  useEditDockForm({save,isDirty:()=>incomplete,isBusy:()=>busy});
  return <section className="loc-card scope-feature-card loc-trace-map-manager" aria-label="路線與痕跡圖管理">
    {owner==='loc'?<p className="scope-status">LOC 空間聚合已暫停並刪除；請先選擇來源 Scope 整理地點。完成後才重建 LOC。</p>:null}
    <header className="loc-trace-map-manager-heading">
      <div><h3>路線圖／痕跡圖管理</h3>
        <p className="scope-status">新增或編輯時可直接點地圖上的既有定錨點加入路線；也可以用自動完成搜尋。路線依點選順序排列，不需要縣市篩選或付費地理服務。</p>
      </div>
      <div className="scope-stat-controls">
        <button type="button" className="loc-button" disabled={busy||!own} onClick={()=>openNew('space_period')}>新增路線圖</button>
        <button type="button" className="loc-button" disabled={busy||!own} onClick={()=>openNew('space_trace')}>新增痕跡圖</button>
      </div>
    </header>
    {scopeId==='loc'?<label>資料 Scope
      <select className="scope-select" value={owner} onChange={e=>{if(allowLeave())setOwner(e.target.value);}}>
        <option value="loc">LOC</option><option value="lo3rwang">作者</option><option value="lrunes">LunaRunes</option>
      </select>
    </label>:null}
    {!own?<p className="scope-status">可公開閱讀；新增與編輯需該 Scope 的管理權限。</p>:null}
    <label>搜尋已儲存的路線／痕跡圖
      <input type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="依標題搜尋"/>
    </label>
    {index.isPending?<p className="scope-status">載入列表中…</p>:null}
    {index.error?<p role="alert" className="scope-status scope-error">{String(index.error.message||index.error)}</p>:null}
    <div className="loc-trace-saved-maps">
      {visibleRecords.map(row=><div className="loc-trace-saved-map" key={row.uid}>
        <button type="button" className="loc-trace-saved-map-summary"
          onClick={()=>{if(allowLeave()){setSelectedUid(row.uid);setShowMap(true);setEditorOpen(false);clear();}}}>
          <span>{row.title}</span>
          <span className="scope-status">{row.trace_type==='space_period'?'路線 · '+row.anchor_list.length+' 站':'痕跡 · '+row.anchor_list.length+' 段'}</span>
        </button>
        {current?.uid===row.uid?<div className="scope-stat-controls">
          <button type="button" className="loc-button" disabled={!own||busy} onClick={()=>openEdit(row)}>編輯</button>
          <button type="button" className="loc-button" onClick={()=>setShowMap(v=>!v)}>{showMap?'收起':'查看'}地圖</button>
          <button type="button" className="loc-button" onClick={()=>{
            if(setDefaultTraceRoute(owner,row.uid))setNotice('已設為預設顯示');}}>設為預設</button>
          <button type="button" className="loc-button" disabled={!own||busy} onClick={()=>remove(row)}>刪除</button>
        </div>:null}
      </div>)}
    </div>
    {editorOpen?<form className="loc-trace-route-composer" onSubmit={save}>
      <h4>{editingUid?'編輯':'新增'}{type==='space_period'?'路線圖':'痕跡圖'}</h4>
      <div className="scope-management-fields">
        <label>名稱<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} disabled={busy}/></label>
        <label>說明<textarea rows={2} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
      </div>
      <div className="scope-stat-controls">
        <button type="button" className="loc-button" disabled={busy} onClick={()=>setShowMap(value=>!value)}>
          {showMap?'收起地圖選點':'展開地圖選點'}
        </button>
        <span className="scope-status">{type==='space_period'?'點地圖上的定錨點，依序加入 Queue。':'先點起點，再點終點，即建立一段痕跡連線。'}{mapStart?' 已選起點：'+(anchorMap.get(mapStart)?.title||mapStart):''}</span>
      </div>
      {showMap?<TraceMap spatialData={{anchors:allAnchors,maps:preview?[preview]:[]}}
        selectedRouteUid={preview?.uid||''} hideRoutePicker
        onAnchorSelect={addMapSelectedAnchor}/>:null}
      <h4>1. Spool — 收集可配置的地點</h4>
      {anchorIndex.isPending?<p className="scope-status">正在載入本 Scope 的地點標題…</p>:null}
      {anchorIndex.error?<p role="alert" className="scope-error">{String(anchorIndex.error.message||anchorIndex.error)}</p>:null}
      <div className="loc-trace-route-pickers">
        <div className="loc-trace-route-autocomplete">
          <label htmlFor="trace-spool-title-search">搜尋地點標題</label>
          <Select inputId="trace-spool-title-search" instanceId="trace-spool-title-search"
            options={options.filter(opt=>!spool.includes(opt.value))}
            value={selectedAnchor} onChange={setSelectedAnchor}
            isClearable isDisabled={busy||anchorIndex.isPending}
            placeholder="輸入標題，自動完成（不限縣市）"
            noOptionsMessage={()=>'沒有符合地點'} classNamePrefix="loc-react-select"/>
        </div>
        <button className="loc-button" type="button" disabled={!selectedAnchor||busy} onClick={addToSpool}>＋ 加入 Spool</button>
      </div>
      <div className="loc-trace-selection-order">
        {spool.map(uid=><div key={uid} className="loc-trace-route-queue-actions">
          <span>{anchorMap.get(uid)?.title||uid} · {uid}</span>
          <button type="button" className="loc-button" disabled={busy} onClick={()=>removeFromSpool(uid)}>移除</button>
        </div>)}
      </div>
      <h4>2. {type==='space_period'?'路線 Queue（依選點先後）':'痕跡線段（不限制順序、可重用端點）'}</h4>
      {type==='space_period'?<>
        <div className="loc-trace-route-pickers">
          <Select inputId="trace-queue-stop" instanceId="trace-queue-stop"
            options={availableRoadOptions} value={availableRoadOptions.find(x=>x.value===selectedStop)||null}
            onChange={option=>setSelectedStop(option?.value||'')} isClearable
            isDisabled={busy||queue.length>=MAX_ROAD} placeholder="選擇下一站（選過即消失）"
            classNamePrefix="loc-react-select"/>
          <button type="button" className="loc-button" onClick={addRoadStop}
            disabled={busy||!selectedStop}>＋ 加入 Queue</button>
        </div>
        <ol className="loc-trace-selection-order">{queue.map((uid,i)=><li key={uid}>
          <span>{anchorMap.get(uid)?.title||uid}</span>
          <div className="loc-trace-route-queue-actions">
            <button type="button" className="loc-button" onClick={()=>shift(i,-1)} disabled={busy||i===0}>↑</button>
            <button type="button" className="loc-button" onClick={()=>shift(i,1)} disabled={busy||i===queue.length-1}>↓</button>
            <button type="button" className="loc-button" onClick={()=>setQueue(items=>items.filter(x=>x!==uid))} disabled={busy}>移除</button>
          </div>
        </li>)}</ol>
      </>:<>
        <div className="loc-trace-route-pickers" role="group" aria-label="新增痕跡線段">
          <label>起點
            <select className="scope-select" value={from} onChange={e=>setFrom(e.target.value)} disabled={busy}>
              <option value="">選擇 Spool 地點</option>
              {poolOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label>終點
            <select className="scope-select" value={to} onChange={e=>setTo(e.target.value)} disabled={busy}>
              <option value="">選擇 Spool 地點</option>
              {poolOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <button type="button" className="loc-button" disabled={busy||!from||!to||from===to}
            onClick={addPair}>＋ 加入線段</button>
        </div>
        <div className="loc-trace-selection-order">{pairs.map((pair,i)=><div key={pair.join(':')+':'+i}>
          {anchorMap.get(pair[0])?.title||pair[0]} — {anchorMap.get(pair[1])?.title||pair[1]}
          <button type="button" className="loc-button" disabled={busy}
            onClick={()=>setPairs(items=>items.filter((_,j)=>j!==i))}>移除</button>
        </div>)}</div>
      </>}
      <div className="scope-stat-controls">
        <button className="loc-button primary" type="submit" disabled={busy||!own||anchorIndex.isPending||Boolean(anchorIndex.error)||!title.trim()||
          (type==='space_period'?queue.length<2:pairs.length<1)}>
          {busy?'儲存中…':'儲存'+(type==='space_period'?'路線圖':'痕跡圖')}
        </button>
        <button type="button" className="loc-button" disabled={busy}
          onClick={()=>{if(allowLeave()){clear();setEditorOpen(false);}}}>取消</button>
      </div>
    </form>:null}
    {!editorOpen&&showMap&&preview?<TraceMap spatialData={{anchors:previewAnchors,maps:[preview]}}
      selectedRouteUid={preview.uid} hideRoutePicker/>:null}
    {notice?<p role={error?'alert':'status'} className={'scope-status'+(error?' scope-error':'')}>{notice}</p>:null}
  </section>;
}
