export const LUNARUNES_GOVERNANCE_SUBTITLE='符號式語言的治理、Canon 與權利邊界。管理也在此。';

export default function LunaRunesGovernance(){
  return <>
    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <p className="loc-eyebrow">LunaRunes Governance</p>
        <h2>符號式語言治理</h2>
        <p>LunaRunes（月之符文）是 <strong>Symbolic Language／符號式語言</strong>，使用自己的符號、Canon、引用與衍生治理方式。</p>
        <p>Current 定義使用現行正式符文名稱與規則；歷史版本保留演變，但不反向污染 Current Canon。</p>
      </section>
      <section className="loc-card" id="neutrality">
        <p className="loc-eyebrow">Oracle Neutrality</p>
        <h2>籤詩系統中立宣言</h2>
        <p>抽牌、籤詩與解牌內容只供參考，不是命令，也不是唯一答案。系統協助看見當下的符號、文字與可能脈絡，但不替使用者決定身份、價值判斷或下一步行動。</p>
        <p>使用者保留自己的判斷與決定；任何符文結果都不應被視為對現實事件的強制裁決。</p>
      </section>
    </div>
    <section className="loc-card" id="rights">
      <p className="loc-eyebrow">Copyright · LunaRunes</p>
      <h2>符文與籤詩系統著作權</h2>
      <p>LunaRunes 的符號式語言、符文設計、名稱、文字、籤詩系統、解牌結構與相關原創內容受 <strong>Copyright／著作權</strong> 保護。</p>
      <p>LunaRunes 不採 LOC 的 Copyleft，也不採 LOC 的 GNU GPL。引用、改作、衍生、再利用與商業使用，依 LunaRunes 自己的治理規則與作者明示授權處理。</p>
      <p>被 LOC 收錄、搜尋、統計或分析，不會改變 LunaRunes 本身的權利狀態。</p>
	  <p>未來這些資產將給個人工作室(EsotericVerse,秘藝文域)作為版權保護。</p>
    </section>
  </>;
}
