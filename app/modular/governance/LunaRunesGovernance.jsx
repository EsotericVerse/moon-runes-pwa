import ScopeEditableBlocks from '../../loc/ScopeEditableBlocks';

export const LUNARUNES_GOVERNANCE_SUBTITLE='說明月之符文的使用原則、恆定符文、著作權與核心所有權原則。';

export default function LunaRunesGovernance({scopeId='lrunes'}){
  return <ScopeEditableBlocks
    scopeId={scopeId}
    page="governance"
    className="loc-grid two governance-grid"
    headingLevel={2}
  />;
}
