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
      <p>月之符文的符文體系設計、原創文字、籤詩系統、解牌結構與相關原創內容受著作權保護。</p>
      <p>月之符文不因與 LOC 共存於同一 Repository、被 LOC 收錄或由 LOC 分析，而自動套用 LOC 的 Copyleft 治理方向或其他程式碼授權。引用、改作、衍生、再利用與商業使用，依月之符文自己的治理規則與作者明示授權處理。</p>
      <p>內容被 LOC 收錄、搜尋、統計或分析，不會改變月之符文本身的權利狀態。</p>
    </section>
    <section className="loc-card" id="core-buyout">
      <h2>核心買斷原則</h2>
      <p>LunaRunes 的核心語言系統不出售。</p>
      <p>若必須為其完整永久買斷指定一個有限價格，則以 LunaRunes 本身的完整變化空間作為定義：</p>
      <p><strong>66! × 4⁶⁶</strong></p>
      <p>即：66 張符文全部有序抽取，並計入每張符文的四向狀態。</p>
      <p>不另行換算，不提供折價，也不以一般市場估值取代此原則。</p>
      <p>LunaRunes 可以被使用、研究、延伸與創作；核心所有權不因此移轉。</p>
    </section>
  </>;
}
