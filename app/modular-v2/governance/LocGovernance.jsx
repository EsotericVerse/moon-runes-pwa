export const LOC_GOVERNANCE_SUBTITLE='說明月典的使用原則、權利邊界與管理方式。';

export function LocGovernanceLaw({canEdit=false}){
  return <div className="loc-grid two governance-law-grid">
    <section className="loc-card" id="copyright">
      <h2>公開程式碼與授權</h2>
      <p>LOC Repository 的公開可見性主要用於檢視、協作與版本追溯；公開可讀不等於整個 LOC 專案已被授權為 Open Source，也不代表其中所有內容都可以自由複製、改作、散布或商業使用。</p>
      <p>若特定程式碼、檔案或資產另有明示的 LICENSE 或授權聲明，該部分依其明示條件處理；沒有明示授權的內容，不由本頁擴張其使用權。</p>
      <p>LOC 的名稱、文件、架構敘述、資料內容、個人作品、LunaRunes、第三方內容、私人資料與另有權利條件的資產，各自維持原有的權利狀態。</p>
    </section>
    <section className="loc-card" id="documents">
      <h2>治理文件</h2>
      <p><a href="https://github.com/EsotericVerse/moon-runes-pwa">LOC Repository</a>：原始碼、README、版本紀錄與個別授權聲明由 Repository 統一管理。</p>
      <p><a href="https://github.com/EsotericVerse/moon-runes-pwa/blob/main/docs/LOC_CANON.md">LOC Current Canon</a>：記錄月典目前採用的架構、定義與治理基準。</p>
    </section>
  </div>;
}

export default function LocGovernance({canEdit=false}){
  return <>
    <div className="loc-grid two governance-grid governance-grid-loc">
      <section className="loc-card" id="principles">
        <h2>治理原則</h2>
        <p className="loc-core-line">尊重 · 和平 · 包容 · 友善</p>
        <p>月典用來整理、搜尋、統計與呈現文字、作品和時間脈絡，但不替使用者決定立場、身份或人生選擇。</p>
        <p>系統提供的是整理與理解資料的方法，不是唯一答案。資料可以被重新比較與理解，但原始紀錄、來源與版本應盡量保留。</p>
      </section>
      <section className="loc-card" id="scope-boundary">
        <h2>治理邊界</h2>
        <p>不同資料區域可以互相引用、連結與比較，但各自保有自己的內容、權利與管理責任。</p>
        <p>月典提供共同的整理框架，不替其他區域決定著作權、授權方式或法律立場。</p>
      </section>
      <section className="loc-card" id="loc-lunarunes-relationship">
        <h2>月典與月之符文</h2>
        <p>月典（LOC）是語言架構框架，用來整理、歸類與呈現資料；月之符文（LunaRunes）則是一套獨立的符號式語言與原創系統。</p>
        <p>兩者可以互相參照，但不互相依賴。使用月典不必使用月之符文；使用月之符文，也不必限定在月典裡。</p>
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
