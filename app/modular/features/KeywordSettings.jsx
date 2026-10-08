'use client';

import dynamic from 'next/dynamic';
import {useAccount} from '../../loc/use-account';
import {useScopeRuntime} from '../use-scope-runtime';
import {scopeHref} from '../scope-registry';
import {FeaturePage} from '../ui';

const KeywordLibraryPanel=dynamic(()=>import('../../loc/KeywordLibraryPanel'),{
  loading:()=> <p className="scope-status">載入關鍵詞設定…</p>
});

export default function KeywordSettings(){
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const authorized=Boolean(account.user&&scopeId!=='loc'&&scopeId!=='lrunes'&&!scope?.aggregateChildren&&account.canManageScopeSync(scopeId));
  return <FeaturePage featureId="statics">
    <section className="loc-card scope-feature-card">
      <h2>關鍵詞設定</h2>
      <p className="scope-status">此頁獨立於統計查詢。手動編輯不會啟動 vis-network；只有選擇視覺圖譜才載入圖形。</p>
      <a className="loc-button" href={scopeHref(scopeId,'statics')}>返回統計頁</a>
    </section>
    {account.loading||account.permissionLoading
      ?<p className="scope-status">正在確認管理權限…</p>
      :authorized?<KeywordLibraryPanel scopeId={scopeId}/>
      :<section className="loc-card scope-feature-card"><p className="scope-status">此頁僅供擁有該 Scope 管理權限的登入者使用。</p></section>}
  </FeaturePage>;
}
