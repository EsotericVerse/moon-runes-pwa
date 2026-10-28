'use client';

import {useAccount} from './use-account';
import {useEditDock} from '../modular/edit-dock';
import {FeaturePage} from '../modular/ui';
import ManagementSectionNav from '../modular/ManagementSectionNav';

// Shared workspace layout and access boundary; each management capability
// still owns its own route, data, editor, and lifecycle.
export default function LocManagementWorkspace({featureId,navId,item,children,standalone=false}){
  const account=useAccount();
  const editDock=useEditDock();
  const canManage=Boolean(account.user&&!account.loading&&!account.permissionLoading&&
    editDock?.active&&editDock.scopeId==='loc'&&account.canManageGroupSync('loc'));

  if(account.loading||account.permissionLoading)return <FeaturePage featureId={featureId}>
    <section className="loc-card scope-feature-card" role="status">正在確認管理權限…</section>
  </FeaturePage>;
  if(!account.user)return <FeaturePage featureId={featureId}>
    <section className="loc-card scope-feature-card">
      <p>請先至設定首頁登入。</p>
    </section>
  </FeaturePage>;
  if(!canManage)return <FeaturePage featureId={featureId}>
    <section className="loc-card scope-feature-card"><p>目前帳號沒有 LOC 管理權限。</p></section>
  </FeaturePage>;

  if(standalone)return <FeaturePage featureId={featureId}>{children}</FeaturePage>;

  const panelId=navId+'-panel';
  return <FeaturePage featureId={featureId}>
    <div className="management-workspace">
      <ManagementSectionNav id={navId} title={item.label} panelId={panelId}
        items={[item]} value={item.value} onChange={()=>{}}/>
      <div className="management-workspace-panel" id={panelId} role="region"
        aria-labelledby={navId+'-option-'+item.value}>
        {children}
      </div>
    </div>
  </FeaturePage>;
}
