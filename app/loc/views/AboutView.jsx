import ScopeEditableBlocks from '../ScopeEditableBlocks';
import LocHomeBlockDisplay,{locHomeBlockClass} from '../LocHomeBlockDisplay';

export default function AboutView(){
  return <section className="loc-view loc-home">
    <ScopeEditableBlocks
      scopeId="loc"
      page="index"
      headingLevel={2}
      allowEditing
      containerless
      maxBlocks={8}
      renderDisplay={LocHomeBlockDisplay}
      resolveSlotClassName={locHomeBlockClass}
      editSlotClassName="loc-card loc-home-block"
    />
  </section>;
}
