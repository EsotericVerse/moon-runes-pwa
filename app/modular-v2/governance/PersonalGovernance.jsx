export const PERSONAL_GOVERNANCE_SUBTITLE='說明個人資料、作品權利與管理方式。';

export default function PersonalGovernance({canEdit=false}){
  return <>
    <div className="loc-grid two governance-grid governance-grid-personal">
      <section className="loc-card" id="principles">
        <h2>個人資料與作品</h2>
        <p>此治理頁適用於 Lucas Oscar Wang 政德的個人資料、文字、音樂、多媒體與其他公開作品紀錄。</p>
        <p>LOC 可以協助整理、搜尋、統計與呈現這些內容，但資料被收錄或分析，不會因此改變原作品的作者權利或既有授權條件。</p>
      </section>
      <section className="loc-card" id="analysis-baseline">
        <h2>來源與分析</h2>
        <p>作品與風格分析以可追溯的原稿、原始貼文、版本與來源為優先依據。</p>
        <p>轉錄、轉貼、引用、AI 輔助或來源不明的內容可以保留，但應與原作及可確認來源的內容清楚區分，不混為同一層級。</p>
        <p>時間資料用於分期與比較，不重寫作品原本的日期、來源或作者資訊。</p>
      </section>
    </div>
    <section className="loc-card" id="rights">
      <h2>著作權與授權</h2>
      <p>個人文字、歌曲、小說、多媒體與其他原創作品，保留其原有著作權與個別作品的授權條件。</p>
      <p>作品被 LOC 收錄、公開展示、搜尋、統計或分析，只代表系統對資料進行整理或呈現，不等於授權第三人自由複製、改作、散布、商業使用或以其他方式再利用。</p>
      <p>個別作品若另有明示授權，依該授權條件處理；未另行明示者，權利狀態不因 LOC 的技術處理、公開展示或治理方式而改變。</p>
    </section>
  </>;
}
