import ScopeEditableBlocks from '../../loc/ScopeEditableBlocks';
import {useAccount} from '../../loc/use-account';

export const LOC_GOVERNANCE_SUBTITLE='說明月典的使用原則、權利邊界與管理方式。';

export default function LocGovernance(){
  const account=useAccount();
  const canManage=account.canManageGlobalSync()||account.canManageScopeSync('loc');
  return <>
    {canManage?<nav className="loc-card" aria-label="治理管理入口">
      <a className="loc-button primary" href="/settings/?section=manage">管理選單</a>
    </nav>:null}
    <ScopeEditableBlocks
      scopeId="loc"
      page="governance"
      className="loc-grid two governance-grid governance-grid-loc"
      headingLevel={2}
    />
  </>;
}
