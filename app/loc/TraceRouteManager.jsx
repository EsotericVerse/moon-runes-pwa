'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useSearchParams} from 'next/navigation';
import {useAccount} from './use-account';
import {useEditDockForm} from '../modular/edit-dock';
import {useAsyncResource,useResourceCache} from './use-async-resource';
import {TRACE_SCOPES,traceMapIndexKey,traceCurrentKey,traceAllAnchorsKey,readTraceMapIndex,
  readCurrentTraceAnchors,readTraceAnchorSuggestions,readTracePopularAnchors,readTraceAddressReferences,
  addTraceAnchor,addTraceMap,updateTraceMap,deleteTraceMap} from '../modular/features/trace/trace-data';
import {TRACE_COUNTY_IDS} from '../modular/features/trace/trace-county-id.mjs';
import {routeClasses,routeGroups,traceClassLabel,searchTraceRoutes,validateTraceRouteLabels} from '../modular/features/trace/trace-route-classes.mjs';
import {readDefaultTraceRoute,setDefaultTraceRoute,clearDefaultTraceRoute,chooseDefaultTraceRoute}
  from '../modular/features/trace/trace-route-preference.mjs';

const TraceMap=dynamic(()=>import('../modular/features/trace/TraceMap'),{
  ssr:false,loading:()=> <p className="scope-status" role="status">正在載入此痕跡圖地圖…</p>
});
const countyOptions=[...Object.entries(TRACE_COUNTY_IDS).map(([name,id])=>({name,id})),
  {id:'OTHER',name:'未判定／其他地區'}];
const MAX_STOPS=80;
const ALL_CLASSES='__trace_all_classes__';
const ALL_GROUPS='__trace_all_groups__';
const normalize=value=>String(value||'').trim();

export default function TraceRouteManager({scopeId}){
  const account=useAccount();
  const cache=useResourceCache();
  const searchParams=useSearchParams();
  const requestedFrame=searchParams?.get('frame')||'';
  const [activeScope,setActiveScope]=useState(scopeId);
  const [selectedUid,setSelectedUid]=useState('');
  const [classFilter,setClassFilter]=useState(ALL_CLASSES);
  const [groupFilter,setGroupFilter]=useState(ALL_GROUPS);
  const [routeFilter,setRouteFilter]=useState('');
  const [editingUid,setEditingUid]=useState('');
  const [editorOpen,setEditorOpen]=useState(false);
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [className,setClassName]=useState('');
  const [group,setGroup]=useState('');
  const [queue,setQueue]=useState([]);
  const [extraAnchors,setExtraAnchors]=useState([]);
  const [county,setCounty]=useState('');
  const [pointQuery,setPointQuery]=useState('');
  const [debouncedQuery,setDebouncedQuery]=useState('');
  const [picked,setPicked]=useState(null);
  const [popularOpen,setPopularOpen]=useState(false);
  const [showMap,setShowMap]=useState(false);
  const [referenceOpen,setReferenceOpen]=useState(false);
  const [referenceQuery,setReferenceQuery]=useState('');
  const [debouncedReference,setDebouncedReference]=useState('');
  const [referenceDraft,setReferenceDraft]=useState(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [isError,setIsError]=useState(false);
  const pendingSaved=useRef(null);
  const pendingReference=useRef(null);
  const openedFrame=useRef('');

  useEffect(()=>{
    const timer=setTimeout(()=>setDebouncedQuery(normalize(pointQuery)),240);
    return()=>clearTimeout(timer);
  },[pointQuery]);
  useEffect(()=>{
    const timer=setTimeout(()=>setDebouncedReference(normalize(referenceQuery)),280);
    return()=>clearTimeout(timer);
  },[referenceQuery]);
  useEffect(()=>{
    setSelectedUid('');setClassFilter(ALL_CLASSES);setGroupFilter(ALL_GROUPS);setRouteFilter('');
    setEditingUid('');setEditorOpen(false);setShowMap(false);setQueue([]);setExtraAnchors([]);
    setCounty('');setPointQuery('');setPicked(null);setPopularOpen(false);
    setReferenceOpen(false);setReferenceQuery('');setReferenceDraft(null);
    pendingReference.current=null;pendingSaved.current=null;setNotice('');setIsError(false);
  },[activeScope]);

  // Index contains only saved Frame metadata, never the entire spatial anchor table.
  const index=useAsyncResource({
    queryKey:['trace-manager-index',activeScope],
    enabled:TRACE_SCOPES.includes(activeScope),
    queryFn:()=>readTraceMapIndex(activeScope,{nativeOnly:activeScope==='loc'}),
    revalidateIfStale:false,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const maps=index.data||[];
  const preferredUid=readDefaultTraceRoute(activeScope);
  const current=maps.find(map=>map.uid===selectedUid)
    ||chooseDefaultTraceRoute(maps,activeScope,preferredUid);
  const route=useAsyncResource({
    queryKey:current?traceCurrentKey(activeScope,current):null,
    enabled:Boolean(current),
    queryFn:()=>readCurrentTraceAnchors(activeScope,current.anchor_uids,
      {nativeOnly:activeScope==='loc'}),
    revalidateIfStale:false,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const availableClasses=useMemo(()=>routeClasses(maps),[maps]);
  const availableGroups=useMemo(()=>routeGroups(maps,classFilter),[maps,classFilter]);
  const listed=useMemo(()=>searchTraceRoutes(maps,{
    ...(classFilter!==ALL_CLASSES?{className:classFilter}:{}),
    ...(classFilter!==ALL_CLASSES&&groupFilter!==ALL_GROUPS?{group:groupFilter}:{}),query:routeFilter
  }),[maps,classFilter,groupFilter,routeFilter]);
  // Keep the UI permission aligned with silver.can_manage_scope().
  const canEdit=account.canManageScopeSync(activeScope);

  // The selected Frame and specifically selected autocomplete entries
  // are the only anchor rows retained by the editor.
  const anchors=useMemo(()=>{
    const byId=new Map([...(route.data||[]),...extraAnchors].map(row=>[row.uid,row]));
    return byId;
  },[route.data,extraAnchors]);
  const missing=queue.filter(uid=>!anchors.has(uid));
  const autocomplete=useAsyncResource({
    queryKey:['trace-frame-anchor-completion',activeScope,county,debouncedQuery],
    enabled:editorOpen&&Boolean(county&&debouncedQuery),
    queryFn:()=>readTraceAnchorSuggestions(activeScope,county,debouncedQuery,8),
    revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const suggestions=debouncedQuery===normalize(pointQuery)?autocomplete.data||[]:[];
  const choice=picked&&picked.title===pointQuery&&
    (picked.county_id||'OTHER')===county?picked
    :suggestions.length===1?suggestions[0]:null;
  const references=useAsyncResource({
    queryKey:['trace-address-references',activeScope,debouncedReference],
    enabled:editorOpen&&referenceOpen&&debouncedReference.length>=2,
    queryFn:()=>readTraceAddressReferences(activeScope,debouncedReference,8),
    revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const popular=useAsyncResource({
    queryKey:['trace-frame-popular',activeScope],
    enabled:editorOpen&&popularOpen,
    queryFn:()=>readTracePopularAnchors(activeScope),
    revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const dirty=editorOpen&&Boolean(editingUid||title||description||className||group||queue.length||referenceDraft);
  const clearEntry=()=>{
    setEditingUid('');setTitle('');setDescription('');setClassName('');setGroup('');
    setQueue([]);setExtraAnchors([]);setCounty('');setPointQuery('');setPicked(null);
    pendingSaved.current=null;pendingReference.current=null;setPopularOpen(false);
    setReferenceOpen(false);setReferenceQuery('');setReferenceDraft(null);
  };
  const mayLeave=()=>!dirty||window.confirm('目前有尚未儲存的痕跡圖修改，確定放棄？');
  const chooseScope=value=>{
    if(busy||!mayLeave())return;
    setActiveScope(value);
  };
  const chooseMap=map=>{
    if(busy||!mayLeave())return;
    clearEntry();setEditorOpen(false);setSelectedUid(map.uid);setShowMap(true);
    setNotice('');setIsError(false);
  };
  const startNew=()=>{
    if(busy||!mayLeave())return;
    clearEntry();setEditorOpen(true);setShowMap(false);setNotice('');setIsError(false);
  };
  const edit=map=>{
    if(busy||!mayLeave())return;
    clearEntry();setSelectedUid(map.uid);setEditingUid(map.uid);
    setTitle(map.title||'');setDescription(map.description||'');
    setClassName(map.class||'');setGroup(map.class_group||'');
    setQueue(Array.isArray(map.anchor_uids)?[...map.anchor_uids]:[]);
    setEditorOpen(true);setShowMap(true);setNotice('');setIsError(false);
  };
  // A Trace page's Edit action opens the exact current Frame, not an
  // unrelated browser-local default. Revalidate by UID in the fetched index.
  useEffect(()=>{
    if(!/^[A-Za-z0-9]{8}$/.test(requestedFrame)||!canEdit||!index.data)return;
    const key=activeScope+':'+requestedFrame;
    if(openedFrame.current===key)return;
    const target=index.data.find(map=>map.uid===requestedFrame);
    if(!target)return;
    openedFrame.current=key;
    edit(target);
  },[activeScope,canEdit,index.data,requestedFrame]);
  const pickAnchor=item=>{
    setCounty(item.county_id||'OTHER');
    setPointQuery(item.title);setPicked(item);
  };
  const addPoint=()=>{
    if(!choice||queue.includes(choice.uid)||queue.length>=MAX_STOPS)return;
    setExtraAnchors(rows=>rows.some(x=>x.uid===choice.uid)?rows:[...rows,choice]);
    setQueue(ids=>[...ids,choice.uid]);setPointQuery('');setPicked(null);
  };
  const changeReference=(field,value)=>setReferenceDraft(row=>row?{...row,[field]:value}:null);
  const selectReference=row=>{
    if(busy||!canEdit||pendingReference.current)return;
    setReferenceDraft({source_scope:row.source_scope,source_uid:row.uid,
      title:row.title,address:row.address||'',floor_label:row.floor_label||'',
      floor_level:row.floor_level??'',longitude:row.longitude,latitude:row.latitude,
      radius_m:row.radius_m||500,description:''});
  };
  // An external address is a suggestion only. Its UID cannot enter a route:
  // create a new anchor within the current authorized Scope, then read it back.
  const createReferenceAnchor=async()=>{
    if(busy||!canEdit||!referenceDraft||queue.length>=MAX_STOPS)return false;
    setBusy(true);setNotice('');setIsError(false);
    try{
      const draft=referenceDraft,owner=activeScope,receipt=pendingReference.current;
      if(receipt&&(receipt.owner!==owner||receipt.source_uid!==draft.source_uid))
        throw Error('上次新增尚未確認，請先重讀原錨點。');
      let uid=receipt?.uid;
      if(!uid){
        const {source_scope,source_uid,...fields}=draft;
        const saved=await addTraceAnchor({scopeId:owner,...fields});
        if(saved?.reused||!/^[A-Za-z0-9]{8}$/.test(saved?.uid||''))
          throw Error('建立自己的錨點失敗，來源地址未修改。');
        uid=saved.uid;
        pendingReference.current={uid,owner,source_uid:draft.source_uid};
      }
      const [confirmed]=await readCurrentTraceAnchors(owner,[uid],{nativeOnly:owner==='loc'});
      if(!confirmed||confirmed.uid!==uid||confirmed.source_scope!==owner)
        throw Error('新錨點已寫入但尚未重讀確認，再按一次只會重讀，不會重複新增。');
      setExtraAnchors(rows=>rows.some(x=>x.uid===uid)?rows:[...rows,confirmed]);
      setQueue(ids=>ids.includes(uid)?ids:[...ids,uid]);
      pendingReference.current=null;setReferenceDraft(null);setReferenceQuery('');
      setReferenceOpen(false);
      await Promise.allSettled([
        cache.invalidate({queryKey:traceAllAnchorsKey(owner)}),
        cache.invalidate({queryKey:['trace-current',owner]})
      ]);
      setNotice('已建立 '+owner+' 專屬空間錨點 '+uid+' 並加入 Queue；公用參考未修改。');
      return true;
    }catch(error){setIsError(true);setNotice(String(error?.message||error));return false;}
    finally{setBusy(false);}
  };
  const shift=(index,step)=>{
    setQueue(ids=>{
      const next=index+step;
      if(next<0||next>=ids.length)return ids;
      const copy=[...ids];[copy[index],copy[next]]=[copy[next],copy[index]];
      return copy;
    });
  };
  const refreshFrame=async updatedScope=>{
    await Promise.allSettled([...new Set([updatedScope,'loc'])].map(id=>
      cache.invalidate({queryKey:traceMapIndexKey(id)})));
    await cache.invalidate({queryKey:['trace-current',updatedScope]});
  };
  const save=async event=>{
    event?.preventDefault?.();
    if(busy||!canEdit||!editorOpen)return false;
    setBusy(true);setNotice('');setIsError(false);
    try{
      const labels=validateTraceRouteLabels(className,group);
      if(queue.length<2||queue.length>MAX_STOPS||new Set(queue).size!==queue.length)
        throw Error('請依照順序加入 2～80 個不重複的定錨點。');
      if(missing.length)throw Error('目前 Frame 有未取得的錨點，請先確認全部站點已載入。');
      const input={scopeId:activeScope,title,description,className:labels.class,
        group:labels.class_group,anchorUids:queue,anchors:[...anchors.values()]};
      let saved=pendingSaved.current;
      if(saved&&(saved.editingUid!==editingUid||saved.scopeId!==activeScope))
        throw Error('上次寫入尚未確認，請重新載入後再操作。');
      if(!saved){
        const result=editingUid?await updateTraceMap({...input,uid:editingUid}):await addTraceMap(input);
        if(!result?.uid)throw Error('資料庫沒有回傳 Frame UID。');
        saved={uid:result.uid,editingUid,scopeId:activeScope};pendingSaved.current=saved;
      }
      const latest=await index.mutate();
      const found=latest?.find(map=>map.uid===saved.uid);
      if(!found||found.title!==normalize(title)
        ||normalize(found.description)!==normalize(description)
        ||normalize(found.class)!==labels.class
        ||normalize(found.class_group)!==labels.class_group
        ||JSON.stringify(found.anchor_uids||[])!==JSON.stringify(queue))
        throw Error('寫入已回應，但重讀尚未確認。保留草稿；再按儲存只會重讀，不會重複新增。');
      setSelectedUid(saved.uid);clearEntry();setEditorOpen(false);setShowMap(true);
      let cacheWarning=false;
      try{await refreshFrame(activeScope);}catch{cacheWarning=true;}
      setNotice('痕跡圖已儲存並重新讀取確認。'+(cacheWarning?'其他已開啟頁面可能需要手動重新整理。':''));
      return true;
    }catch(error){setIsError(true);setNotice(String(error?.message||error));return false;}
    finally{setBusy(false);}
  };
  const remove=async map=>{
    if(busy||!canEdit||!window.confirm('刪除「'+map.title+'」痕跡圖？不會刪除空間錨點或 Galaxy 文章。'))return;
    setBusy(true);setNotice('');setIsError(false);
    try{
      await deleteTraceMap({scopeId:activeScope,uid:map.uid});
      const latest=await index.mutate();
      if(!Array.isArray(latest)||latest.some(row=>row.uid===map.uid))
        throw Error('資料庫刪除已回應，但重讀仍找到路線。');
      if(readDefaultTraceRoute(activeScope)===map.uid)clearDefaultTraceRoute(activeScope,map.uid);
      if(selectedUid===map.uid){setSelectedUid('');setShowMap(false);}
      if(editingUid===map.uid){clearEntry();setEditorOpen(false);}
      let cacheWarning=false;
      try{await refreshFrame(activeScope);}catch{cacheWarning=true;}
      setNotice('痕跡圖已刪除並重讀確認；空間錨點與文章未受影響。'+(cacheWarning?'其他已開啟頁面可能需要手動重新整理。':''));
    }catch(error){setIsError(true);setNotice(String(error?.message||error));}
    finally{setBusy(false);}
  };
  const markDefault=map=>{
    if(!setDefaultTraceRoute(activeScope,map.uid)){
      setIsError(true);setNotice('無法保存此瀏覽器的預設 Frame。');return;
    }
    setSelectedUid(map.uid);setNotice('已設為此瀏覽器的預設痕跡圖。');
  };
  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy});
  const previewFrame=editorOpen&&queue.length>=2&&missing.length===0
    ?{uid:editingUid||'DRAFT000',source_scope:activeScope,trace_type:'map',
      title:title||'編輯預覽',anchor_uids:queue}:current;
  const previewAnchors=editorOpen&&queue.length>=2&&missing.length===0
    ?queue.map(uid=>anchors.get(uid))
    :route.data||[];
  const showPreview=showMap&&Boolean(previewFrame)&&!route.isPending;

  return <section className="loc-card scope-feature-card loc-trace-map-manager" aria-label="痕跡圖 Frame 管理">
    <header className="loc-trace-map-manager-heading">
      <div><h3>痕跡圖管理</h3>
        <p className="scope-status">Class → 領域 → 具名痕跡圖。站點 Queue 僅於選中 Frame 後載入；選錨點必須按 ＋ 才加入。</p>
      </div>
      <button className="loc-button" type="button" disabled={busy||!canEdit}
        onClick={startNew}>新增痕跡圖</button>
    </header>
    {scopeId==='loc'?<label>作品範圍
      <select className="scope-select" value={activeScope} disabled={busy}
        onChange={event=>chooseScope(event.target.value)}>
        <option value="loc">LOC 自有痕跡</option>
        <option value="lo3rwang">作者作品</option>
        <option value="lrunes">月之符文</option>
      </select>
    </label>:null}
    {!canEdit?<p className="scope-status">可查看路線；編輯需該 Scope 的管理權限（寫入仍由 Supabase RLS 驗證）。</p>:null}
    <div className="loc-trace-route-browse">
      <label>Class
        <select className="scope-select" value={classFilter}
          onChange={event=>{setClassFilter(event.target.value);setGroupFilter(ALL_GROUPS);}}>
          <option value={ALL_CLASSES}>全部 Class</option>
          {availableClasses.map(value=><option key={value||'_empty'} value={value}>{traceClassLabel(value)}</option>)}
        </select>
      </label>
      <label>領域
        <select className="scope-select" value={groupFilter}
          disabled={classFilter===ALL_CLASSES}
          onChange={event=>setGroupFilter(event.target.value)}>
          <option value={ALL_GROUPS}>全部領域</option>
          {availableGroups.map(value=><option key={value||'_empty'} value={value}>{value||'未分組'}</option>)}
        </select>
      </label>
      <label>尋找痕跡圖
        <input type="search" value={routeFilter}
          onChange={event=>setRouteFilter(event.target.value)}
          placeholder="輸入名稱／領域，不搜尋文章內容"/>
      </label>
    </div>
    {index.isPending?<p role="status" className="scope-status">正在載入痕跡圖索引…</p>:null}
    {index.error?<p role="alert" className="scope-status scope-error">{String(index.error.message||index.error)}</p>:null}
    {!index.isPending&&!index.error?<div className="loc-trace-saved-maps">
      <h4>已儲存痕跡圖（{listed.length}）</h4>
      {listed.map(map=><div key={map.uid} className="loc-trace-saved-map">
        <button className="loc-trace-saved-map-summary" type="button"
          aria-current={current?.uid===map.uid?'true':undefined}
          onClick={()=>chooseMap(map)}>
          <span aria-hidden="true">{current?.uid===map.uid?'▾':'▸'}</span>
          <span>{map.title}</span><span className="scope-status">{map.anchor_uids?.length||0} 站</span>
        </button>
        {current?.uid===map.uid?<div className="loc-trace-saved-map-body">
          {map.description?<p>{map.description}</p>:null}
          {route.isPending?<p role="status" className="scope-status">正在讀取目前 Frame 的站點…</p>:null}
          {route.error?<p role="alert" className="scope-status scope-error">{String(route.error.message||route.error)}</p>:null}
          {route.data?<ol className="loc-trace-selection-order">
            {map.anchor_uids?.map((uid,j)=><li key={uid+':'+j}>
              {route.data.find(x=>x.uid===uid)?.title||'尚未對應的錨點 UID '+uid}
            </li>)}
          </ol>:null}
          <div className="scope-stat-controls">
            <button className="loc-button" type="button" disabled={busy||!canEdit} onClick={()=>edit(map)}>編輯這張痕跡圖</button>
            <button className="loc-button" type="button" disabled={busy} onClick={()=>{setShowMap(value=>!value);}}>
              {showMap?'收合地圖':'顯示地圖'}
            </button>
            <button className="loc-button" type="button" disabled={busy} onClick={()=>markDefault(map)}>設為預設</button>
            <button className="loc-button" type="button" disabled={busy||!canEdit} onClick={()=>remove(map)}>刪除</button>
          </div>
        </div>:null}
      </div>)}
      {!listed.length?<p className="scope-status">此分類沒有痕跡圖；可建立新的 Frame。</p>:null}
    </div>:null}
    {showPreview?<TraceMap spatialData={{anchors:previewAnchors,maps:[previewFrame]}}
      selectedRouteUid={previewFrame.uid} hideRoutePicker/>:null}
    {editorOpen?<form className="loc-trace-route-composer" onSubmit={save}>
      <h4>{editingUid?'編輯痕跡圖':'新增痕跡圖'}</h4>
      <div className="scope-management-fields">
        <label>痕跡圖名稱 <input value={title} maxLength={120} required disabled={busy}
          onChange={event=>setTitle(event.target.value)}/></label>
        <label>Class <input value={className} maxLength={100} disabled={busy}
          placeholder="例如：跟朋友" onChange={event=>{setClassName(event.target.value);if(!event.target.value.trim())setGroup('');}}/></label>
        <label>領域（Group）<input value={group} maxLength={100} disabled={busy||!className.trim()}
          placeholder="例如：夜市" onChange={event=>setGroup(event.target.value)}/></label>
        <label>路線說明 <textarea value={description} maxLength={2000} rows={3} disabled={busy}
          onChange={event=>setDescription(event.target.value)}/></label>
      </div>
      <div className="loc-trace-route-pickers" role="group" aria-label="加入空間定錨點">
        <label>縣市
          <select className="scope-select" value={county} disabled={busy}
            onChange={event=>{setCounty(event.target.value);setPointQuery('');setPicked(null);}}>
            <option value="">選擇縣市</option>
            {countyOptions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div className="loc-trace-route-autocomplete">
          <label htmlFor="trace-map-anchor-search">空間錨點自動完成</label>
          <input id="trace-map-anchor-search" className="scope-select" type="search" autoComplete="off"
            role="combobox" aria-autocomplete="list" aria-expanded={Boolean(county&&pointQuery.trim())}
            aria-controls="trace-map-anchor-options" placeholder={county?'輸入地點名稱':'先選縣市'}
            value={pointQuery} disabled={busy||!county}
            onChange={event=>{setPointQuery(event.target.value);setPicked(null);}}/>
          {county&&pointQuery.trim()&&!picked?<div id="trace-map-anchor-options"
            role="listbox" className="loc-trace-route-suggestions">
            {debouncedQuery!==normalize(pointQuery)||autocomplete.isPending
              ?<p className="scope-status" role="status">搜尋錨點中…</p>
              :autocomplete.error?<p className="scope-status scope-error" role="alert">{String(autocomplete.error.message||autocomplete.error)}</p>
              :suggestions.length?suggestions.map(anchor=><button type="button" role="option"
                aria-selected={choice?.uid===anchor.uid} className="loc-button" key={anchor.uid}
                onClick={()=>pickAnchor(anchor)}>
                <span>{anchor.title}</span><small>UID {anchor.uid} · {Number(anchor.latitude).toFixed(4)}, {Number(anchor.longitude).toFixed(4)}</small>
              </button>):<p className="scope-status">沒有符合的空間錨點</p>}
            {suggestions.length===8?<p className="scope-status">僅顯示前八筆，繼續輸入可縮小範圍。</p>:null}
          </div>:null}
        </div>
        <button className="loc-button loc-trace-route-add" type="button"
          aria-label="將選取錨點加入 Queue" disabled={busy||!choice||queue.includes(choice.uid)||queue.length>=MAX_STOPS}
          onClick={addPoint}>＋</button>
      </div>
      <div className="scope-stat-controls">
        <button className="loc-button" type="button" disabled={busy}
          onClick={()=>setPopularOpen(open=>!open)}>常用前 10 名</button>
      </div>
      {popularOpen?<div className="loc-trace-quick-results">
        {popular.isPending?<p className="scope-status">載入常用站點…</p>:null}
        {popular.error?<p role="alert" className="scope-status scope-error">{String(popular.error.message||popular.error)}</p>:null}
        {(popular.data||[]).map(item=><button className="loc-button" type="button" key={item.uid}
          disabled={queue.includes(item.uid)||busy} onClick={()=>pickAnchor(item)}>
          {item.title}（{item.usage_count}）</button>)}
        {popular.data&&!popular.data.length?<p className="scope-status">目前沒有重複使用的常用站點。</p>:null}
      </div>:null}
      <section className="loc-trace-reference-panel" aria-label="跨 Scope 公用地址參考">
        <button type="button" className="loc-button" disabled={busy||!canEdit||Boolean(pendingReference.current)}
          aria-expanded={referenceOpen} onClick={()=>{
            setReferenceOpen(value=>!value);setReferenceDraft(null);setReferenceQuery('');
          }}>{referenceOpen?'收合公用地址':'從 LOC 公用地址參考建立錨點'}</button>
        {referenceOpen?<div className="loc-trace-reference-body">
          <p className="scope-status">僅參考其他 Scope 已儲存的地址，並不保證地址正確。核對後才建立目前 Scope 的獨立 UID；不修改參考來源或直接沿用其 UID。請勿公開私人住址。</p>
          <label>搜尋名稱或完整地址（至少兩字）
            <input type="search" value={referenceQuery} maxLength={100}
              disabled={busy||Boolean(pendingReference.current)}
              onChange={event=>{setReferenceQuery(event.target.value);setReferenceDraft(null);}}
              placeholder="例如：板橋車站、文化路門牌"/>
          </label>
          {referenceQuery.trim().length>=2&&!referenceDraft?<div className="loc-trace-route-suggestions">
            {normalize(referenceQuery)!==debouncedReference||references.isPending
              ?<p role="status" className="scope-status">讀取公用地址中…</p>
              :references.error?<p role="alert" className="scope-status scope-error">{String(references.error.message||references.error)}</p>
              :references.data?.length?references.data.map(row=><button key={row.source_scope+':'+row.uid}
                className="loc-button" type="button" disabled={busy}
                onClick={()=>selectReference(row)}>
                <span>{row.title} · {row.address}{row.floor_label?' · '+row.floor_label:''}</span>
                <small>參考 Scope {row.source_scope} · UID {row.uid}</small>
              </button>):<p className="scope-status">沒有符合的既有參考地址。仍可到空間定錨頁自行建立地點。</p>}
            {references.data?.length===8?<p className="scope-status">最多顯示前八筆，繼續輸入可縮小範圍。</p>:null}
          </div>:null}
          {referenceDraft?<div className="scope-management-fields">
            <p className="scope-status">唯讀來源：{referenceDraft.source_scope} · {referenceDraft.source_uid}；核對下列內容後明確建立自己的錨點。</p>
            <label>自己錨點的名稱<input maxLength={120} value={referenceDraft.title}
              disabled={busy||Boolean(pendingReference.current)}
              onChange={event=>changeReference('title',event.target.value)}/></label>
            <label>完整地址<input maxLength={320} value={referenceDraft.address}
              disabled={busy||Boolean(pendingReference.current)}
              onChange={event=>changeReference('address',event.target.value)}/></label>
            <label>樓層／室別<input maxLength={40} value={referenceDraft.floor_label}
              disabled={busy||Boolean(pendingReference.current)}
              onChange={event=>changeReference('floor_label',event.target.value)}/></label>
            <label>樓層序號（可空；不是高度公尺）<input type="number" min={-100} max={300} step={1}
              value={referenceDraft.floor_level} disabled={busy||Boolean(pendingReference.current)}
              onChange={event=>changeReference('floor_level',event.target.value)}/></label>
            <label>經度<input type="number" min={-180} max={180} step="any" value={referenceDraft.longitude}
              disabled={busy||Boolean(pendingReference.current)}
              onChange={event=>changeReference('longitude',event.target.value)}/></label>
            <label>緯度<input type="number" min={-90} max={90} step="any" value={referenceDraft.latitude}
              disabled={busy||Boolean(pendingReference.current)}
              onChange={event=>changeReference('latitude',event.target.value)}/></label>
            <button type="button" className="loc-button primary" disabled={busy||!canEdit||queue.length>=MAX_STOPS}
              onClick={createReferenceAnchor}>＋ 建立自己的錨點並加入 Queue</button>
          </div>:null}
        </div>:null}
      </section>
      <h4>站點 Queue（{queue.length}／{MAX_STOPS}）</h4>
      {missing.length?<p className="scope-status" role="status">正在讀取目前 Frame 的既有站點…</p>:null}
      <ol className="loc-trace-selection-order">
        {queue.map((uid,index)=><li key={uid}>
          <span>{anchors.get(uid)?.title||'載入中的錨點 '+uid}</span>
          <div className="loc-trace-route-queue-actions">
            <button className="loc-button" type="button" disabled={busy||index===0}
              onClick={()=>shift(index,-1)} aria-label={'上移第'+(index+1)+'站'}>↑</button>
            <button className="loc-button" type="button" disabled={busy||index===queue.length-1}
              onClick={()=>shift(index,1)} aria-label={'下移第'+(index+1)+'站'}>↓</button>
            <button className="loc-button" type="button" disabled={busy}
              onClick={()=>setQueue(ids=>ids.filter(x=>x!==uid))}>移除</button>
          </div>
        </li>)}
      </ol>
      {!queue.length?<p className="scope-status">目前沒有站點。兩站不需要相鄰；連線只表示行經順序。</p>:null}
      <div className="scope-stat-controls">
        <button className="loc-button primary" type="submit" disabled={busy||!canEdit||!title.trim()||queue.length<2||missing.length>0}>
          {busy?'儲存中…':editingUid?'儲存痕跡圖修改':'儲存新痕跡圖'}
        </button>
        <button className="loc-button" type="button" disabled={busy}
          onClick={()=>{if(mayLeave()){clearEntry();setEditorOpen(false);}}}>取消</button>
      </div>
    </form>:null}
    {notice?<p role={isError?'alert':'status'} className={'scope-status'+(isError?' scope-error':'')}>{notice}</p>:null}
  </section>;
}
