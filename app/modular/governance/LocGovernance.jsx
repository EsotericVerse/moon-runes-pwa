import ScopeEditableBlocks from '../../loc/ScopeEditableBlocks';

export const LOC_GOVERNANCE_SUBTITLE='說明月典的使用原則、權利邊界與管理方式。';

export default function LocGovernance(){
  return <ScopeEditableBlocks
    scopeId="loc"
    page="governance"
    className="loc-grid two governance-grid governance-grid-loc"
    headingLevel={2}
  />;
}
