import ScopeEditableBlocks from '../../loc/ScopeEditableBlocks';

export const PERSONAL_GOVERNANCE_SUBTITLE='說明個人作品的來源、版本與著作權原則。';

export default function PersonalGovernance({scopeId='lo3rwang'}){
  return <ScopeEditableBlocks
    scopeId={scopeId}
    page="governance"
    className="loc-grid two governance-grid"
    headingLevel={2}
  />;
}
