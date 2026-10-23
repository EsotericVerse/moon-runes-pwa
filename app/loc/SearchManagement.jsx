'use client';

import dynamic from 'next/dynamic';
import ScopeLink from '../modular/ScopeLink';
import {FeaturePage} from '../modular/ui';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {useAccount} from './use-account';

const ManagementSearchWorkspace=dynamic(
  ()=>import('../modular/features/Search'),
  {loading:()=> <p className="scope-status" role="status">載入搜尋管理…</p>}
);

/**
 * Dedicated management route. The public Search page never mounts this page.
 * Only an authorized Scope manager or global admin may load the workspace.
 * Database RLS independently enforces access to hidden records.
 */
export default function SearchManagement(){
  const {scopeId}=useScopeRuntime();
  const account=useAccount();
  const ready=!account.loading&&!account.permissionLoading;
  const permitted=ready&&Boolean(account.user)&&(
    scopeId==='loc'
      ?account.canManageGlobalSync()||account.scopes.length>0
      :account.canManageScopeSync(scopeId)
  );
  if(!ready)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card" role="status">正在確認管理權限…</section>
  </FeaturePage>;
  if(!account.user)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card">
      <p>請先登入，才能使用搜尋管理。</p>
      <ScopeLink className="loc-button primary" href="/settings/?section=account">前往登入</ScopeLink>
    </section>
  </FeaturePage>;
  if(!permitted)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card" role="alert">沒有此 Scope 的管理權限。</section>
  </FeaturePage>;
  return <ManagementSearchWorkspace managementMode/>;
}
