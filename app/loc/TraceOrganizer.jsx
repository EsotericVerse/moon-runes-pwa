'use client';

import {useEffect,useMemo,useState} from 'react';
import {dbAuthClient} from './db-client.mjs';
import {reviewPlaceNameGroups,compactPlaceName} from '../modular/features/trace/trace-place-names.mjs';

const canonical=items=>[...items].sort((a,b)=>
  String(a.uid||'').localeCompare(String(b.uid||'')))[0];

export default function TraceOrganizer({scopeId,spatial,reload}){
  const anchors=useMemo(()=>(spatial.anchors||[]).filter(item=>
    item.trace_type==='space_anchor'&&item.source_scope===scopeId),[spatial.anchors,scopeId]);
  const {automatic,uncertain}=useMemo(()=>reviewPlaceNameGroups(anchors),[anchors]);
  const [dismissed,setDismissed]=useState([]);
  const [keepers,setKeepers]=useState({});
  useEffect(()=>{
    try{
      const value=JSON.parse(window.localStorage.getItem('loc-trace-distinct-v1:'+scopeId)||'[]');
      setDismissed(Array.isArray(value)?value:[]);
    }catch{setDismissed([]);}
  },[scopeId]);
  const reviewGroups=useMemo(()=>[
    ...automatic,...uncertain
  ].filter(group=>!dismissed.includes(group.key))
    .sort((a,b)=>b.items.length-a.items.length||
      String(canonical(a.items)?.title||'').localeCompare(String(canonical(b.items)?.title||''),'zh-Hant')||
      a.key.localeCompare(b.key)),[automatic,uncertain,dismissed]);
  const visibleGroups=reviewGroups.slice(0,80);
  const keepOf=group=>group.items.find(item=>item.uid===keepers[group.key])||canonical(group.items);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState(false);
  const [checked,setChecked]=useState({});
  const [placeName,setPlaceName]=useState('');
  const [selectedUid,setSelectedUid]=useState('');
  const [aliases,setAliases]=useState([]);
  const [newAlias,setNewAlias]=useState('');
  const ownPlaces=scopeId!=='loc';
  const place=anchors.find(item=>item.uid===selectedUid);
  useEffect(()=>{
    let live=true;
    if(!selectedUid){setAliases([]);return;}
    dbAuthClient.schema('silver').from(scopeId+'_place')
      .select('name_lists').eq('uid',selectedUid).maybeSingle()
      .then(({data,error:loadError})=>{
        if(!live)return;
        if(loadError){setError(true);setNotice(String(loadError.message||loadError));return;}
        setAliases(data?.name_lists||[]);
      });
    return()=>{live=false;};
  },[scopeId,selectedUid]);
  const saveNames=async()=>{
    if(busy||!selectedUid)return;
    const list=[...new Set([...aliases,newAlias.trim()].filter(Boolean))];
    setBusy(true);setError(false);setNotice('');
    try{
      const {error:saveError}=await dbAuthClient.schema('silver')
        .rpc('save_scope_trace_place_names',{p_scope_id:scopeId,p_uid:selectedUid,p_names:list});
      if(saveError)throw saveError;
      setAliases(list);setNewAlias('');setNotice('已儲存 '+place.title+' 的名稱對照，下次 Facebook 匯入可直接沿用。');
    }catch(saveError){setError(true);setNotice(String(saveError.message||saveError));}
    finally{setBusy(false);}
  };
  const selectedIds=group=>group.items.filter(item=>
    item.uid!==keepOf(group).uid&&checked[group.key]?.[item.uid]).map(item=>item.uid);
  const selectGroup=(group,yes)=>setChecked(current=>({...current,[group.key]:
    Object.fromEntries(group.items.filter(item=>item.uid!==keepOf(group).uid)
      .map(item=>[item.uid,yes]))}));
  const selectAllVisible=yes=>setChecked(current=>{
    const next={...current};
    for(const group of visibleGroups)next[group.key]=Object.fromEntries(
      group.items.filter(item=>item.uid!==keepOf(group).uid).map(item=>[item.uid,yes]));
    return next;
  });
  const markDistinct=group=>{
    const next=[...new Set([...dismissed,group.key])];
    setDismissed(next);
    setChecked(current=>({...current,[group.key]:{}}));
    try{window.localStorage.setItem('loc-trace-distinct-v1:'+scopeId,JSON.stringify(next));}
    catch{setError(true);setNotice('本次已排除候選，但瀏覽器無法保存此選擇。');}
  };
  const mergeGroup=async(group,uids)=>{
    const keep=keepOf(group);
    const remove=[...new Set(uids)].filter(uid=>uid!==keep.uid);
    if(!remove.length)throw Error('請先勾選要合併至 '+keep.title+' 的地點。');
    // The existing RPC deletes removed anchors and does not rewrite Galaxy place_id.
    // Refuse route-linked UIDs rather than corrupt saved route references.
    if((spatial.maps||[]).some(route=>(route.anchor_list||[]).flat(Infinity)
      .some(uid=>remove.includes(uid))))
      throw Error('勾選地點已被路線或痕跡圖引用；請先調整引用，不能直接刪除該 UID。');
    const {data,error:mergeError}=await dbAuthClient.schema('silver')
      .rpc('merge_scope_trace_place_names',{
        p_scope_id:scopeId,p_keep_uid:keep.uid,p_remove_uids:remove
      });
    if(mergeError)throw mergeError;
    return Number(data||0);
  };
  const saveChecked=async group=>{
    if(busy||!ownPlaces)return;
    const uids=selectedIds(group);
    if(!uids.length){setError(true);setNotice('請先勾選同一地點的 UID。');return;}
    if(!window.confirm('確定保留「'+keepOf(group).title+'」（'+keepOf(group).uid+'），合併並刪除其餘 '+uids.length+' 個 Trace UID？\n路線與文章若仍引用這些 UID，可能需要事先調整。'))return;
    setBusy(true);setError(false);setNotice('');
    try{
      const removed=await mergeGroup(group,uids);
      setChecked(previous=>({...previous,[group.key]:{}}));
      setNotice('已合併 '+removed+' 筆至「'+keepOf(group).title+'」；其餘沒有勾選的資料保留獨立。');
      await reload();
    }catch(mergeError){setError(true);setNotice(String(mergeError.message||mergeError));}
    finally{setBusy(false);}
  };
  const saveAllChecked=async()=>{
    if(busy||!ownPlaces)return;
    const groups=visibleGroups.map(group=>({group,uids:selectedIds(group)})).filter(item=>item.uids.length);
    const count=groups.reduce((sum,item)=>sum+item.uids.length,0);
    if(!count){setNotice('請先勾選要合併的地點。');return;}
    if(!window.confirm('確定依各組選定的保留 UID，批次合併 '+groups.length+' 組、刪除 '+count+' 個 UID？\n操作無法復原，請先確認每組是同一地點。'))return;
    setBusy(true);setError(false);setNotice('');
    let merged=0,completed=0;
    try{
      for(const {group,uids} of groups){
        merged+=await mergeGroup(group,uids);
        completed++;
        setChecked(previous=>({...previous,[group.key]:{}}));
      }
      setNotice('已合併 '+completed+' 組、'+merged+' 筆；保留各組選擇的標準名稱。');
    }catch(e){
      setError(true);
      setNotice('已完成 '+completed+' 組，剩餘未處理。原因：'+String(e.message||e));
    }finally{
      if(completed)try{await reload();}catch(e){setError(true);setNotice(n=>n+' 重新讀取失敗：'+String(e.message||e));}
      setBusy(false);
    }
  };
  const matches=useMemo(()=>{
    const q=compactPlaceName(placeName);
    if(!q)return [];
    return anchors.filter(item=>compactPlaceName(item.title).includes(q)).slice(0,30);
  },[anchors,placeName]);
  return <section className="loc-card scope-feature-card" aria-label="地點管理及名稱合併">
    <h3>地點管理 · 名稱整理</h3>
    <p className="scope-status">只列出同 Scope、相同座標、完整名稱字元完全一致（順序可以不同）的候選；不使用「大學」「高鐵」「站」等部分共同文字推測。勾選不會自動合併；可選擇任意一筆保留為標準名稱與 UID。</p>
    <div className="scope-stat-controls" role="status">
      <span>目前地點：{anchors.length}</span>
      <span>同名同座標：{automatic.length} 組</span>
      <span>需要確認：{uncertain.length} 組</span>
    </div>
    <section className="scope-card">
      <h4>重複名稱候選 · 依筆數排序</h4>
      <p className="scope-status">從組內選一筆要保留的名稱與 UID；可單組全選或全部勾選。全部勾選不會直接儲存。不是同一地點可排除此組，下次在同一瀏覽器不再顯示。</p>
      <div className="scope-stat-controls">
        <button type="button" className="loc-button" disabled={busy||!ownPlaces||!visibleGroups.length}
          onClick={()=>selectAllVisible(true)}>全部勾選（目前顯示 {visibleGroups.length} 組）</button>
        <button type="button" className="loc-button" disabled={busy} onClick={()=>selectAllVisible(false)}>全部取消勾選</button>
        <button type="button" className="loc-button primary" disabled={busy||!ownPlaces||
          !visibleGroups.some(group=>selectedIds(group).length)}
          onClick={saveAllChecked}>儲存全部已勾選</button>
        {dismissed.length?<button type="button" className="loc-button" disabled={busy} onClick={()=>{
          setDismissed([]);
          try{window.localStorage.removeItem('loc-trace-distinct-v1:'+scopeId);}catch{}
        }}>還原已排除的 {dismissed.length} 組</button>:null}
      </div>
      {!reviewGroups.length?<p className="scope-status">沒有符合完整名稱排列及相同座標條件的候選。</p>:null}
      {visibleGroups.map(group=>{
        const keep=keepOf(group);
        const selectable=group.items.filter(item=>item.uid!==keep.uid);
        const selected=selectedIds(group);
        return <details key={group.key} className="loc-trace-article-choice">
          <summary>{keep.title} · {group.items.length} 筆 · {group.reason}</summary>
          <label>保留哪一筆名稱／UID？
            <select className="scope-select" disabled={busy} value={keep.uid}
              onChange={event=>{
                setKeepers(current=>({...current,[group.key]:event.target.value}));
                setChecked(current=>({...current,[group.key]:{}}));
              }}>
              {group.items.map(item=><option key={item.uid} value={item.uid}>
                {item.title} · UID {item.uid}
              </option>)}
            </select>
          </label>
          {selectable.map(item=><label key={item.uid}>
            <input type="checkbox" disabled={busy||!ownPlaces} checked={Boolean(checked[group.key]?.[item.uid])}
              onChange={event=>setChecked(current=>({...current,[group.key]:{
                ...current[group.key],[item.uid]:event.target.checked
              }}))}/>
            {item.title} · UID {item.uid}
          </label>)}
          <div className="scope-stat-controls">
            <button type="button" className="loc-button" disabled={busy||!ownPlaces}
              onClick={()=>selectGroup(group,true)}>全選本組（{selectable.length} 筆）</button>
            <button type="button" className="loc-button" disabled={busy}
              onClick={()=>selectGroup(group,false)}>取消本組勾選</button>
            <button type="button" className="loc-button primary" disabled={busy||!ownPlaces||!selected.length}
              onClick={()=>saveChecked(group)}>儲存已勾選（{selected.length} 筆）</button>
            <button type="button" className="loc-button" disabled={busy}
              onClick={()=>markDistinct(group)}>不是同一地點 · 保持獨立</button>
          </div>
        </details>;
      })}
      {reviewGroups.length>80?<p className="scope-status">已顯示前 80 組，完成後重新載入下一批。</p>:null}
    </section>
    <section className="scope-card">
      <h4>管理已確認的地點名稱</h4>
      <label>搜尋既有地點
        <input type="search" value={placeName} placeholder="輸入名稱，不限縣市" onChange={event=>setPlaceName(event.target.value)}/>
      </label>
      {matches.length?<div className="loc-trace-route-suggestions" role="group" aria-label="既有地點">
        {matches.map(item=><button className="loc-button" type="button" key={item.uid}
          onClick={()=>{setSelectedUid(item.uid);setNewAlias('');}}>
          {item.title} · UID {item.uid}
        </button>)}
      </div>:null}
      {place?<div className="scope-management-fields">
        <p>主要名稱：{place.title} · UID {place.uid}</p>
        <p>已確認別名：{aliases.length?aliases.join('、'):'無'}</p>
        <label>新增名稱變體
          <input value={newAlias} maxLength={200} onChange={event=>setNewAlias(event.target.value)}
            placeholder="例如：WorldGym 新北永和店"/>
        </label>
        <button className="loc-button primary" type="button" disabled={busy||!ownPlaces||!newAlias.trim()}
          onClick={saveNames}>儲存名稱對照</button>
      </div>:null}
    </section>
    {notice?<p role={error?'alert':'status'} className={'scope-status'+(error?' scope-error':'')}>{notice}</p>:null}
  </section>;
}
