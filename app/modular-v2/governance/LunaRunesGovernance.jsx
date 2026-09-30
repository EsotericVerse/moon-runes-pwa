export const LUNARUNES_GOVERNANCE_SUBTITLE='說明月之符文的使用原則、正式定義、權利與管理方式。';

export default function LunaRunesGovernance({canEdit=false}){
  return <>
    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <h2>使用原則</h2>
        <p>月之符文是一套符號式語言，以固定的符文、分組、卡牌方向與月相關係提供文字指引。</p>
        <p>目前使用的符文名稱、定義與規則以正式 Canon 為準；歷史版本保留演變過程，但不取代現行定義。</p>
      </section>
      <section className="loc-card" id="neutrality">
        <h2>使用邊界</h2>
        <p>抽牌、籤詩與解牌內容只供參考，不是命令，也不是唯一答案。</p>
        <p>系統協助整理當下的符號、文字與可能脈絡，但不替使用者決定身份、價值判斷或下一步行動。最後的判斷與選擇仍由使用者自己決定。</p>
      </section>
    </div>
    <section className="loc-card" id="rights">
      <h2>著作權與授權</h2>
      <p>月之符文的符文設計、名稱、文字、籤詩系統、解牌結構與相關原創內容受著作權保護。</p>
      <p>月之符文不採 LOC 的 Copyleft 或 GNU GPL。引用、改作、衍生、再利用與商業使用，依月之符文自己的治理規則與作者明示授權處理。</p>
      <p>內容被 LOC 收錄、搜尋、統計或分析，不會改變月之符文本身的權利狀態。</p>
    </section>
  </>;
}
