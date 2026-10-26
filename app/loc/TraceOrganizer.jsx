'use client';

import {useEffect,useMemo,useState} from 'react';
import {dbAuthClient} from './db-client.mjs';
import {reviewPlaceNameGroups,compactPlaceName} from '../modular/features/trace/trace-place-names.mjs';

const canonical=items=>[...items].sort((a,b)=>
  String(a.created_at||'').localeCompare(String(b.created_at||''))||
  String(a.uid||'').localeCompare(String(b.uid||'')))[0];

export default function TraceOrganizer({scopeId,spatial,reload}){
  const anchors=useMemo(()=>(spatial.anchors||[]).filter(item=>
    item.trace_type==='anchor'&&item.source_scope===scopeId),[spatial.anchors,scopeId]);
  const {automatic,uncertain}=useMemo(()=>reviewPlaceNameGroups(anchors),[anchors]);
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
  const mergeGroup=async(group,uids)=>{
    const keep=canonical(group.items);
    const remove=[...new Set(uids)].filter(uid=>uid!==keep.uid);
    if(!remove.length)throw Error('請先勾選要合併至 '+keep.title+' 的地點。');
    const {data,error:mergeError}=await dbAuthClient.schema('silver')
      .rpc('merge_scope_trace_place_names',{
        p_scope_id:scopeId,p_keep_uid:keep.uid,p_remove_uids:remove
      });
    if(mergeError)throw mergeError;
    return Number(data||0);
  };
  const runAutomatic=async()=>{
    if(busy||!automatic.length||!ownPlaces)return;
    setBusy(true);setError(false);setNotice('');
    let completed=0,groups=0;
    try{
      for(const group of automatic){
        completed+=await mergeGroup(group,group.items.slice(1).map(item=>item.uid));
        groups++;
      }
      setNotice('已完成 '+groups+' 組明確名稱變體合併，共整理 '+completed+' 個重複 UID；首筆名稱不變。');
    }catch(mergeError){
      setError(true);setNotice('已完成 '+groups+' 組。後續已停止：'+String(mergeError.message||mergeError));
    }finally{
      try{await reload();}catch(e){setError(true);setNotice(current=>current+' 資料庫已回報寫入，但重讀失敗：'+String(e.message||e));}
      setBusy(false);
    }
  };
  const saveChecked=async(group)=>{
    if(busy||!ownPlaces)return;
    const uids=Object.keys(checked[group.key]||{}).filter(uid=>checked[group.key][uid]);
    if(!uids.length){setError(true);setNotice('先勾選確認為同一地點的項目。');return;}
    setBusy(true);setError(false);setNotice('');
    try{
      const removed=await mergeGroup(group,uids);
      setChecked(previous=>({...previous,[group.key]:{}}));
      setNotice('已保存 '+removed+' 個確認相同的地點，使用首筆 Trace UID；其餘仍保持獨立。');
      await reload();
    }catch(mergeError){setError(true);setNotice(String(mergeError.message||mergeError));}
    finally{setBusy(false);}
  };
  const matches=useMemo(()=>{
    const q=compactPlaceName(placeName);
    if(!q)return [];
    return anchors.filter(item=>compactPlaceName(item.title).includes(q)).slice(0,30);
  },[anchors,placeName]);
  return <section className="loc-card scope-feature-card" aria-label="地點管理及名稱合併">
    <h3>地點管理 · 名稱整理</h3>
    <p className="scope-status">只比對地點名稱與已儲存別名，不使用地址、縣市或 GPS 判定相同。保留最早建立的名稱和 UID；不同樓層／不同實體保持獨立。任何整理都不修改 Galaxy.source_place。</p>
    <div className="scope-stat-controls" role="status">
      <span>目前地點：{anchors.length}</span>
      <span>明確名稱變體：{automatic.length} 組</span>
      <span>需要確認：{uncertain.length} 組</span>
    </div>
    {ownPlaces&&automatic.length?<section className="scope-card">
      <h4>可直接整理的文字變體</h4>
      <p className="scope-status">空白、大小寫、台／臺與明確品牌＋分店名稱順序差異，自動歸入最早的 UID，不要求先新增錨點。</p>
      <button className="loc-button primary" type="button" disabled={busy} onClick={runAutomatic}>
        {busy?'整理中…':'合併明確文字變體（'+automatic.length+' 組）'}
      </button>
      <details><summary>查看整理候選</summary>
        {automatic.slice(0,80).map(group=><p key={group.key}>
          <strong>{group.canonical.title}</strong> · {group.items.map(item=>item.title+' ('+item.uid+')').join('、')}
        </p>)}
      </details>
    </section>:null}
    <section className="scope-card">
      <h4>名稱相似，需要確認</h4>
      <p className="scope-status">勾選確定同一地點的名稱，按一次「儲存已勾選」。不勾選就保留原 UID；不同樓層不要合併。</p>
      {!uncertain.length?<p className="scope-status">目前沒有需要人工判斷的名稱候選。</p>:null}
      {uncertain.slice(0,80).map(group=>{
        const keep=canonical(group.items);
        return <details key={group.key} className="loc-trace-article-choice">
          <summary>{keep.title} · {group.items.length} 筆 · {group.reason||'名稱不同'}</summary>
          <p>保留最早的 UID：{keep.uid}（{keep.title}）</p>
          {group.items.filter(item=>item.uid!==keep.uid).map(item=><label key={item.uid}>
            <input type="checkbox" disabled={busy||!ownPlaces} checked={Boolean(checked[group.key]?.[item.uid])}
              onChange={event=>setChecked(current=>({...current,[group.key]:{
                ...current[group.key],[item.uid]:event.target.checked
              }}))}/>
            {item.title} · UID {item.uid}{item.floor_label?' · '+item.floor_label:''}
          </label>)}
          <div className="scope-stat-controls">
            <button type="button" className="loc-button primary" disabled={busy||!ownPlaces}
              onClick={()=>saveChecked(group)}>儲存已勾選（同一 Trace UID）</button>
            <button type="button" className="loc-button" disabled={busy}
              onClick={()=>setChecked(current=>({...current,[group.key]:{}}))}>保持獨立／清除勾選</button>
          </div>
        </details>;
      })}
      {uncertain.length>80?<p className="scope-status">已顯示前 80 組，完成後重新載入下一批。</p>:null}
    </section>
    <section className="scope-card">
      <h4>管理已確認的地點名稱</h4>
      <label>搜尋既有地點
        <input type="search" value={placeName} placeholder="輸入名稱，不限縣市" onChange={event=>setPlaceName(event.target.value)}/>
      </label>
      {matches.length?<div className="loc-trace-route-suggestions" role="group" aria-label="既有地點">
        {matches.map(item=><button className="loc-button" type="button" key={item.uid}
          onClick={()=>{setSelectedUid(item.uid);setNewAlias('');}}>
          {item.title} · UID {item.uid}{item.floor_label?' · '+item.floor_label:''}
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
