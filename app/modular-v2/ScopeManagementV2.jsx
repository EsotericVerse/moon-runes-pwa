'use client';

import {useEffect,useMemo,useState} from 'react';
import ScopeTreeEditor from './modules/scope-tree/ScopeTreeEditor';
import {SCOPE_TREE_LIMITS_V2} from './modules/scope-tree/scope-tree-contract';
import {scopeRowsToTree,scopeRelationsToNodes,requestScopeRelation,selectScopePermissions,selectScopeRelationRequests,selectScopeRelations,decideScopeRelationRequest} from '../loc/neon-scope-governance';
import {getScopeV2} from './scope-registry.v2';

export default function ScopeManagementV2(){
  const [relations,setRelations]=useState([]);const [requests,setRequests]=useState([]);const [permissions,setPermissions]=useState([]);
  const [error,setError]=useState('');const [loading,setLoading]=useState(true);
  const reload=async()=>{setLoading(true);setError('');try{const [r,q,p]=await Promise.all([selectScopeRelations(),selectScopeRelationRequests({status:'pending'}),selectScopePermissions()]);setRelations(r);setRequests(q);setPermissions(p);}catch(e){setError(e?.message||'Scope 管理資料讀取失敗');}finally{setLoading(false);}};
  useEffect(()=>{reload();},[]);
  const tree=useMemo(()=>scopeRowsToTree(relations),[relations]);
  async function moveTree({dragIds,parentId}){const child=dragIds?.[0];if(!child||!parentId)return;try{await requestScopeRelation({parent:parentId,child},{rows:scopeRelationsToNodes(relations)});await reload();}catch(e){setError(e?.message||'Scope 關係申請失敗');}}
  async function decide(item,status){try{await decideScopeRelationRequest(item.id,status);await reload();}catch(e){setError(e?.message||'申請處理失敗');}}
  return <main className="scope-v2-page">
    <header className="scope-v2-hero"><p className="scope-v2-eyebrow">Scope Administration</p><h1>Scope 管理</h1><p>關係、申請、核准與權限集中於 Neon；JSON 目前保留作為歷史／備援資料，不參與此管理 runtime。</p></header>
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {loading?<p className="scope-v2-status">載入中…</p>:null}
    <section className="scope-v2-card"><p className="scope-v2-eyebrow">Scope Tree</p><h2>Scope 關係樹</h2><p>結構限制：父層最多 {SCOPE_TREE_LIMITS_V2.maxParentDepth} 層、子樹最多 {SCOPE_TREE_LIMITS_V2.maxChildDepth} 層、總深度最多 {SCOPE_TREE_LIMITS_V2.maxTotalDepth} 層。拖曳移動會先建立申請，並由同一驗證契約檢查。</p>{tree.length?<ScopeTreeEditor data={tree} height={520} onMove={moveTree}/>:<p>目前沒有可顯示的 Scope 關係。</p>}</section>
    <section className="scope-v2-card"><p className="scope-v2-eyebrow">Approval Queue</p><h2>待核准申請</h2>{requests.length?requests.map(item=><article className="scope-v2-inline-card" key={item.id}><strong>{item.parent_scope_id} → {item.child_scope_id}</strong><span>{item.reason||'未提供理由'}</span><div><button type="button" onClick={()=>decide(item,'approved')}>核准</button> <button type="button" onClick={()=>decide(item,'rejected')}>拒絕</button></div></article>):<p>目前沒有待核准申請。</p>}</section>
    <section className="scope-v2-card"><p className="scope-v2-eyebrow">Permissions</p><h2>Scope 權限</h2>{permissions.length?<div className="scope-v2-list">{permissions.map(item=><div className="scope-v2-inline-card" key={`${item.scope_id}-${item.user_id}-${item.access_level}-${item.case_id}`}><strong>{getScopeV2(item.scope_id).label||item.scope_id}</strong><span>{item.user_id} · {item.access_level} · case {item.case_id}</span></div>)}</div>:<p>目前沒有權限資料。</p>}</section>
  </main>;
}
