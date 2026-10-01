export const PERSONAL_GOVERNANCE_SUBTITLE='說明個人資料、作品權利與管理方式。';

export default function PersonalGovernance({canEdit=false}){
  return <div className="loc-grid two governance-grid governance-grid-personal">
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
    <section className="loc-card governance-card-wide" id="rights">
      <h2>著作權與授權</h2>
      <p>個人文字、歌曲、小說、多媒體與其他原創作品，保留其原有著作權與個別作品的授權條件。</p>
      <p>作品被 LOC 收錄、公開展示、搜尋、統計或分析，只代表系統對資料進行整理或呈現，不等於授權第三人自由複製、改作、散布、商業使用或以其他方式再利用。</p>
      <p>個別作品若另有明示授權，依該授權條件處理；未另行明示者，不因 LOC 的技術、公開展示或治理方式而自動改變權利狀態。</p>
    </section>
  </div>;
}
