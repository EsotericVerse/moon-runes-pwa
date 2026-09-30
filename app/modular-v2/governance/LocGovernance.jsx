export const LOC_GOVERNANCE_SUBTITLE='說明月典的使用原則、權利與管理方式。';

export function LocGovernanceLaw({canEdit=false}){
  return <div className="loc-grid two">
    <section className="loc-card" id="copyright">
      <h2>著作權與授權</h2>
      <p>LOC 採 <strong>Copyleft</strong> 原則，原創程式碼以 <strong>GNU GPL</strong> 為授權方向。</p>
      <p>LOC 的方法、架構與可授權內容可以被研究、使用與延伸，但應保留來源、作者與必要的修改紀錄。</p>
      <p>這個授權範圍只屬於 LOC，不會自動延伸到月之符文、個人作品、第三方內容、私人資料或另有授權條件的資產。</p>
      <p>正式授權版本與條款以 Repository 公開的 LICENSE 文件為準；本頁只說明治理原則，不取代正式授權文件。</p>
    </section>
    <section className="loc-card" id="documents">
      <h2>治理文件</h2>
      <p><a href="https://github.com/EsotericVerse/moon-runes-pwa">程式與授權文件</a>：程式碼、README 與正式授權文件由 Repository 統一管理。</p>
      <p><a href="/docs/LOC_Canon.docx">LOC Canon</a>：記錄月典目前採用的架構、定義與治理基準。</p>
    </section>
  </div>;
}

export default function LocGovernance({canEdit=false}){
  return <>
    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <h2>治理原則</h2>
        <p className="loc-core-line">尊重 · 和平 · 包容 · 友善</p>
        <p>月典用來整理、搜尋、統計與呈現文字、作品和時間脈絡，但不替使用者決定立場、身份或人生選擇。</p>
        <p>系統提供的是整理與理解資料的方法，不是唯一答案。資料可以被重新比較與理解，但原始紀錄、來源與版本應盡量保留。</p>
      </section>
      <section className="loc-card" id="scope-boundary">
        <h2>治理邊界</h2>
        <p>不同資料區域可以互相引用、連結與比較，但各自保有自己的內容與管理權。</p>
        <p>月典提供共同的整理框架，不替其他區域決定著作權、授權方式或法律立場。</p>
      </section>
      <section className="loc-card" id="analysis-provenance">
        <h2>來源與判讀</h2>
        <p>月典可以記錄來源、作者標示、版本與 AI 介入等資訊，作為整理與分析的依據，但不以這些標記直接裁決真正作者、著作權歸屬或內容真偽。</p>
        <p>資料不足時保留未知，不自行猜測。轉錄、轉貼或來源不明的內容可以保留在脈絡中，再由各區域決定是否納入特定分析。</p>
        <p>時間、事件、多媒體、來源與地點都可以成為脈絡的一部分；月典只呈現紀錄與關係，不替使用者解釋其心理或人生意義。</p>
      </section>
    </div>
    <LocGovernanceLaw canEdit={canEdit}/>
  </>;
}
