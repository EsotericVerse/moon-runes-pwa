export const PERSONAL_GOVERNANCE_SUBTITLE='說明個人資料、作品權利與管理方式。';

export default function PersonalGovernance({canEdit=false}){
  return <div className="loc-grid two">
    <section className="loc-card" id="principles">
      <h2>個人資料與作品</h2>
      <p>個人區域用來整理自己的文字、作品、多媒體與公開紀錄。</p>
      <p>LOC 可以協助搜尋、統計與呈現這些資料，但資料進入 LOC 之後，不會因此改變原作品的作者權利或原有授權條件。</p>
    </section>
    <section className="loc-card" id="analysis-baseline">
      <h2>來源與分析</h2>
      <p>原稿、原始貼文、可追溯版本與明確來源，優先作為作品與風格分析的依據。</p>
      <p>轉錄、轉貼、引用、AI 輔助或來源不明的內容可以保留在資料脈絡中，但應分開標示；是否納入特定分析，由該個人區域自行決定。</p>
      <p>時間設定只用來協助分期與比較，不會修改作品原本的日期、來源或作者資訊。</p>
    </section>
    <section className="loc-card" id="rights">
      <h2>著作權與授權</h2>
      <p>個人文字、歌曲、小說、多媒體與其他原創作品，仍依一般著作權與個別作品的授權條件處理。</p>
      <p>這些作品不會因為被 LOC 收錄，就自動套用 LOC 的 Copyleft 或 GNU GPL；除非作品另有明示授權，否則仍由原作者保有原有權利。</p>
    </section>
  </div>;
}
