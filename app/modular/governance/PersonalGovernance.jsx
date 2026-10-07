import ScopeEditableBlocks from '../../loc/ScopeEditableBlocks';

export const PERSONAL_GOVERNANCE_SUBTITLE='說明個人作品的來源、版本與著作權原則。';

export default function PersonalGovernance({scopeId='lo3rwang'}){
  return <ScopeEditableBlocks
    scopeId={scopeId}
    page="governance"
    className="governance-grid"
    fallbackDocuments={[
      [
        {type:'heading',props:{level:2},content:'來源與版本'},
        {type:'paragraph',content:'原稿、原始貼文與可追溯版本，優先作為作品沿革與版本確認的依據。'},
        {type:'paragraph',content:'轉錄、轉貼、引用、AI 輔助或來源不明的內容，應保留其來源與性質標示，避免與原作或可確認版本混淆。'},
        {type:'paragraph',content:'作品的日期、署名、來源與版本沿革應盡量保留；整理、轉載或重新發布，不應改寫原本的歷史紀錄。'}
      ],
      [
        {type:'heading',props:{level:2},content:'著作權與授權'},
        {type:'paragraph',content:'個人文字、歌曲、小說、多媒體與其他原創作品，保留其原有著作權。'},
        {type:'paragraph',content:'除個別作品另有明示授權外，公開展示不代表授權第三人自由複製、改作、散布、商業使用或以其他方式再利用。'},
        {type:'paragraph',content:'個別作品若另有授權條件，依該作品的明示條件處理。'}
      ],
      '',
      ''
    ]}
  />;
}
