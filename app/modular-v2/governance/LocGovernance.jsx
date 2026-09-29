export const LOC_GOVERNANCE_SUBTITLE='LOC 原則、Copyleft 與 GNU GPL。管理也在此。';

export function LocGovernanceLaw({canEdit=false}){
  return <div className="loc-grid two">
    <section className="loc-card" id="copyright">
      <p>LOC 採 <strong>Copyleft</strong> 原則；LOC 的原創程式碼採 <strong>GNU GPL</strong> 授權。</p>
      <p>LOC 的方法、架構與可授權內容可以被研究、使用與延伸，但應保留來源、作者、修改歷史與必要的衍生標示。</p>
      <p>這個授權邊界只屬於 LOC，不自動涵蓋 LunaRunes、個人內容、第三方內容、私人資料或另有權利條件的資產。</p>
      <p>GNU GPL 的正式版本將以 Repository 的 LICENSE 文件為準；在 LICENSE 尚未明定前，不自行推定特定 GPL 版本。</p>
    </section>
    <section className="loc-card" id="documents">
      <p><a href="https://github.com/EsotericVerse/moon-runes-pwa">Repository 文件入口</a>：README、Copyleft 與 GPL 授權文件由 Repository 統一管理。</p>
      <p><a href="/docs/LOC_Canon.docx">LOC Canon</a>：LOC 現行架構、定義與治理基準。</p>
    </section>
  </div>;
}

export default function LocGovernance({canEdit=false}){
  return <>
    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <p className="loc-core-line">尊重 · 和平 · 包容 · 友善</p>
        <p><strong>LOC 本身保持客觀與中立。</strong>它整理語言、資料、脈絡與時間，但不替使用者決定立場、身份或人生選擇。</p>
        <p>LOC 可以被使用、比較、延伸，也可以完全不用；系統提供的是架構與方法，不是唯一答案。</p>
        <p><strong>歷史保留，解釋可校準。</strong>事件、來源與版本保留；定義、方法與解釋可依證據、脈絡與需求重新檢視。</p>
      </section>
      <section className="loc-card" id="scope-boundary">
        <p>各區域擁有自己的資料與治理權。不同區域可以引用、連結與比較，但不因此取得對方治理權。</p>
        <p>LOC 提供治理能力與管理框架，不替其他區域決定著作權、授權方式或法律立場。</p>
      </section>
      <section className="loc-card" id="analysis-provenance">
        <p>LOC 對作者身分、轉錄來源與 AI 介入採可追溯標記與預設分析，不替 Scope 裁決作品真正作者、著作權歸屬或來源真偽。</p>
        <p><strong>AI 判定預設定錨點：2023-01-01。</strong>2022-12-31 以前的文字，在沒有相反證據時預設為人工文字；2023-01-01 起若缺乏明確 provenance，只能視為可能受 AI 影響，不等同判定為 AI 生成。明確原稿、版本紀錄或來源標記可以覆蓋日期預設。</p>
        <p>轉錄、轉貼與來源未知文字是否納入特定分析，由各 Scope 自行治理。未標示轉錄且無法確認來源時，LOC 不猜測作者，保留未知狀態；作者風格、AI 比例等分析是否採計，依該 Scope 的治理規則處理。</p>
        <p>LOC 提供整理、分類、分析與來源追溯工具；來源標示、匯入權限、公開與分析用途的選擇，由實際匯入者與該 Scope 管理者負責。</p>
        <p><strong>LOC 的分析目標是人生軌跡，而不是只分析文字。</strong>文字是其中一種訊號；事件、時間、多媒體紀錄、來源、地點、使用者標記與文字缺席都可以作為定錨與脈絡。多媒體本身不做內容判別；「有大量生活紀錄但文字很少或為零」也可被記錄為時間訊號，但不替使用者解釋其心理或人生意義。</p>
      </section>
    </div>
    <LocGovernanceLaw canEdit={canEdit}/>
  </>;
}
