'use client';

import {useMemo,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import ScopeTreeEditor from './modules/scope-tree/ScopeTreeEditor';
import {SCOPE_TREE_LIMITS_V2} from './modules/scope-tree/scope-tree-contract';
import {scopeRowsToTree,scopeRelationsToNodes,requestScopeRelation,selectScopePermissions,selectScopeRelationRequests,selectScopeRelations,decideScopeRelationRequest} from '../loc/neon-scope-governance';
import {getScopeV2} from './scope-registry.v2';
import {useNeonAccount} from '../loc/use-neon-account';

export default function ScopeManagementV2(){
  const account=useNeonAccount();
  const queryClient=useQueryClient();
  const [permissionError,setPermissionError]=useState('');
  const queryKey=['scope-management-v2',account.user?.id||'anonymous'];
  const canLoad=!account.loading&&!account.permissionLoading&&Boolean(account.user&&account.canManage);
  const managementQuery=useQuery({
    queryKey,
    queryFn:async()=>{
      const [relations,requests,permissions]=await Promise.all([
        selectScopeRelations(),
        selectScopeRelationRequests({status:'pending'}),
        selectScopePermissions()
      ]);
      return {relations,requests,permissions};
    },
    enabled:canLoad,
    staleTime:20_000
  });
  const refresh=()=>queryClient.invalidateQueries({queryKey});
  const relationMutation=useMutation({
    mutationFn:async({parent,child,relations})=>{
      if(!await account.canManageScope(parent))throw new Error('沒有此父 Scope 的管理權限；相鄰 Scope 權限不會授權操作。');
      return requestScopeRelation({parent,child},{rows:scopeRelationsToNodes(relations),requestedBy:account.user?.id});
    },
    onSuccess:refresh
  });
  const decisionMutation=useMutation({
    mutationFn:async({item,status})=>{
      const globalAdmin=await account.canManageGlobal();
      const parentAllowed=globalAdmin||await account.canManageScope(item.parent_scope_id);
      const childAllowed=globalAdmin||await account.canManageScope(item.child_scope_id);
      if(!parentAllowed||!childAllowed)throw new Error('核准／拒絕需同時具有父、子 Scope 權限，或全域管理權限。');
      return decideScopeRelationRequest(item.id,status,'',account.user?.id);
    },
    onSuccess:refresh
  });
  const relations=managementQuery.data?.relations||[];
  const requests=managementQuery.data?.requests||[];
  const permissions=managementQuery.data?.permissions||[];
  const error=permissionError||managementQuery.error?.message||relationMutation.error?.message||decisionMutation.error?.message||'';
  const loading=canLoad&&managementQuery.isPending;
  const tree=useMemo(()=>scopeRowsToTree(relations),[relations]);
  async function moveTree({dragIds,parentId}){
    const child=dragIds?.[0];
    if(!child||!parentId)return;
    setPermissionError('');
    try{await relationMutation.mutateAsync({parent:parentId,child,relations})}
    catch(error){setPermissionError(String(error?.message||error))}
  }
  async function decide(item,status){
    setPermissionError('');
    try{await decisionMutation.mutateAsync({item,status})}
    catch(error){setPermissionError(String(error?.message||error))}
  }
  return <main className="scope-v2-page">
    <header className="scope-v2-hero"><p className="scope-v2-eyebrow">Scope Administration</p><h1>Scope 管理</h1><p>Scope 關係與授權資料由 Neon 提供；操作前以 Casbin 檢查精確 Scope 權限，Neon RLS／核准 RPC 再作資料存取檢查。</p></header>
    {error?<p role="alert" className="scope-v2-status scope-v2-error">{error}</p>:null}
    {managementQuery.error?<p role="alert">Neon Scope 資料讀取失敗：{managementQuery.error.message}</p>:null}
    {account.error?<p role="alert">Neon 權限讀取失敗，已拒絕管理操作：{account.error}</p>:null}
    {account.loading||account.permissionLoading?<p className="scope-v2-status">正在確認 Neon session 與 Scope 管理權限…</p>:null}
    {!account.loading&&!account.permissionLoading&&!account.user?<section className="scope-v2-card"><h2>需要登入</h2><p>請先登入，再由 Neon 確認 Scope 權限。</p><button type="button" onClick={account.signIn}>使用 Google 登入 Neon</button></section>:null}
    {!account.loading&&!account.permissionLoading&&account.user&&!account.canManage?<section className="scope-v2-card"><h2>沒有 Scope 管理權限</h2><p>登入本身不會取得管理權限；需由 Neon 授予 scope_manager 或 global_admin。</p><button type="button" onClick={account.signOut}>登出 Neon</button></section>:null}
    {account.user&&account.canManage?<>
      {loading?<p className="scope-v2-status">正在從 Neon 載入 Scope 關係、申請與授權…</p>:null}
      {!loading&&!managementQuery.error&&relations.length===0&&requests.length===0&&permissions.length===0?<p className="scope-v2-status">Neon 中目前沒有可供此身份讀取的 Scope 資料。</p>:null}
      <section className="scope-v2-card"><p className="scope-v2-eyebrow">Scope Tree</p><h2>Scope 關係樹</h2><p>結構限制：父層最多 {SCOPE_TREE_LIMITS_V2.maxParentDepth} 層、子樹最多 {SCOPE_TREE_LIMITS_V2.maxChildDepth} 層、總深度最多 {SCOPE_TREE_LIMITS_V2.maxTotalDepth} 層。拖曳申請需具有目標父 Scope 的管理權限，Neon 核准流程負責最終確認。</p>{tree.length?<ScopeTreeEditor data={tree} height={520} onMove={moveTree}/>:<p>此身份可讀取的 Scope 關係目前為空。</p>}</section>
      <section className="scope-v2-card"><p className="scope-v2-eyebrow">Approval Queue</p><h2>待核准申請</h2>{requests.length?requests.map(item=><article className="scope-v2-inline-card" key={item.id}><strong>{item.parent_scope_id} → {item.child_scope_id}</strong><span>{item.reason||'未提供理由'}</span><div><button type="button" disabled={decisionMutation.isPending} onClick={()=>decide(item,'approved')}>核准</button> <button type="button" disabled={decisionMutation.isPending} onClick={()=>decide(item,'rejected')}>拒絕</button></div></article>):<p>目前沒有可供此身份核准的待處理申請。</p>}</section>
      <section className="scope-v2-card"><p className="scope-v2-eyebrow">Permissions</p><h2>Scope 權限</h2>{permissions.length?<div className="scope-v2-list">{permissions.map(item=><div className="scope-v2-inline-card" key={`${item.scope_id}-${item.user_id}-${item.access_level}-${item.case_id}`}><strong>{getScopeV2(item.scope_id).label||item.scope_id}</strong><span>{item.user_id} · {item.access_level} · case {item.case_id}</span></div>)}</div>:<p>目前沒有可供此身份讀取的授權資料。</p>}</section>
      <button type="button" onClick={account.signOut}>登出 Neon</button>
    </>:null}
  </main>;
}
