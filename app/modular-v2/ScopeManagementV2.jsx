'use client';

import {useMemo} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import ScopeTreeEditor from './modules/scope-tree/ScopeTreeEditor';
import {SCOPE_TREE_LIMITS_V2} from './modules/scope-tree/scope-tree-contract';
import {scopeRowsToTree,scopeRelationsToNodes,requestScopeRelation,selectScopePermissions,selectScopeRelationRequests,selectScopeRelations,decideScopeRelationRequest} from '../loc/neon-scope-governance';
import {getScopeV2} from './scope-registry.v2';
import {useNeonAccount} from '../loc/use-neon-account';

export default function ScopeManagementV2(){
  const account=useNeonAccount();
  const queryClient=useQueryClient();
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
    mutationFn:({parent,child,relations})=>requestScopeRelation(
      {parent,child},
      {rows:scopeRelationsToNodes(relations),requestedBy:account.user?.id}
    ),
    onSuccess:refresh
  });
  const decisionMutation=useMutation({
    mutationFn:({item,status})=>decideScopeRelationRequest(item.id,status,'',account.user?.id),
    onSuccess:refresh
  });
  const relations=managementQuery.data?.relations||[];
  const requests=managementQuery.data?.requests||[];
  const permissions=managementQuery.data?.permissions||[];
  const error=managementQuery.error?.message||relationMutation.error?.message||decisionMutation.error?.message||'';
  const loading=canLoad&&managementQuery.isPending;
  const tree=useMemo(()=>scopeRowsToTree(relations),[relations]);
  async function moveTree({dragIds,parentId}){
    const child=dragIds?.[0];
    if(!child||!parentId)return;
    await relationMutation.mutateAsync({parent:parentId,child,relations});
  }
  async function decide(item,status){
    await decisionMutation.mutateAsync({item,status});
  }
  return <main className="scope-v2-page">
    <header className="scope-v2-hero"><p className="scope-v2-eyebrow">Scope Administration</p><h1>Scope 管理</h1><p>關係、申請、核准與權限集中於 Neon；JSON 目前保留作為歷史／備援資料，不參與此管理 runtime。</p></header>
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {account.loading||account.permissionLoading?<p className="scope-v2-status">正在確認 Neon session 與 Scope 管理權限…</p>:null}
    {!account.loading&&!account.permissionLoading&&!account.user?<section className="scope-v2-card"><h2>需要登入</h2><p>Scope 管理資料只對已登入的 Neon 使用者查詢。</p><button type="button" onClick={account.signIn}>使用 Google 登入 Neon</button></section>:null}
    {!account.loading&&!account.permissionLoading&&account.user&&!account.canManage?<section className="scope-v2-card"><h2>沒有管理權限</h2><p>此 Neon 身份沒有 Scope manager 或 page manager 權限。</p><button type="button" onClick={account.signOut}>登出 Neon</button></section>:null}
    {account.user&&account.canManage?<>
      {loading?<p className="scope-v2-status">載入中…</p>:null}
      <section className="scope-v2-card"><p className="scope-v2-eyebrow">Scope Tree</p><h2>Scope 關係樹</h2><p>結構限制：父層最多 {SCOPE_TREE_LIMITS_V2.maxParentDepth} 層、子樹最多 {SCOPE_TREE_LIMITS_V2.maxChildDepth} 層、總深度最多 {SCOPE_TREE_LIMITS_V2.maxTotalDepth} 層。拖曳移動會先建立申請，並由同一驗證契約檢查。</p>{tree.length?<ScopeTreeEditor data={tree} height={520} onMove={moveTree}/>:<p>目前沒有可顯示的 Scope 關係。</p>}</section>
      <section className="scope-v2-card"><p className="scope-v2-eyebrow">Approval Queue</p><h2>待核准申請</h2>{requests.length?requests.map(item=><article className="scope-v2-inline-card" key={item.id}><strong>{item.parent_scope_id} → {item.child_scope_id}</strong><span>{item.reason||'未提供理由'}</span><div><button type="button" disabled={decisionMutation.isPending} onClick={()=>decide(item,'approved')}>核准</button> <button type="button" disabled={decisionMutation.isPending} onClick={()=>decide(item,'rejected')}>拒絕</button></div></article>):<p>目前沒有待核准申請。</p>}</section>
      <section className="scope-v2-card"><p className="scope-v2-eyebrow">Permissions</p><h2>Scope 權限</h2>{permissions.length?<div className="scope-v2-list">{permissions.map(item=><div className="scope-v2-inline-card" key={`${item.scope_id}-${item.user_id}-${item.access_level}-${item.case_id}`}><strong>{getScopeV2(item.scope_id).label||item.scope_id}</strong><span>{item.user_id} · {item.access_level} · case {item.case_id}</span></div>)}</div>:<p>目前沒有權限資料。</p>}</section>
      <button type="button" onClick={account.signOut}>登出 Neon</button>
    </>:null}
  </main>;
}
