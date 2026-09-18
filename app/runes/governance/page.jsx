import LocaleControl from '../../loc/LocaleControl';

export const metadata={title:'符文治理｜LunaRunes'};

export default function RunesGovernancePage(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">LunaRunes · Governance</p>
      <h1>符文治理</h1>
      <p className="loc-subtitle">月之符文自己的說明、治理概念與設定管理。共同方法可以沿用 LOC，但資料、權威與設定仍屬 LunaRunes Scope。</p>
    </header>

    <section className="loc-card" id="explanation">
      <p className="loc-eyebrow">Explanation</p>
      <h2>說明</h2>
      <p>月之符文是符號式語言。固定 66 符、Grammar、牌位與方向規則各有自己的 Current authority；抽牌、Graph、搜尋、統計與解讀都是消費端，不反向修改母資料。</p>
      <p>不需要先學會全部符文。可以先從抽牌、FAQ、符文圖鑑、脈絡或符文演算法開始，再依需要深入治理資料。</p>
      <div className="loc-actions">
        <a className="loc-button" href="https://lrunes.lo3rwang.cc/faq">FAQ</a>
        <a className="loc-button" href="https://lrunes.lo3rwang.cc/list">符文圖鑑</a>
        <a className="loc-button" href="https://lrunes.lo3rwang.cc/algorithm">符文演算法</a>
      </div>
    </section>

    <section className="loc-card" id="concept">
      <p className="loc-eyebrow">Concept</p>
      <h2>治理概念</h2>
      <div className="loc-grid two">
        <article className="loc-card">
          <h3>權威順序</h3>
          <p className="loc-core-line">LunaRunes Scope → Master Data／Base66 → Current Canon／Spec → Registry → 衍生結果</p>
          <p>符文名稱、編號、群組、月相與基本定義由母資料治理。Projection、搜尋、解牌與統計不得覆寫上游。</p>
        </article>
        <article className="loc-card">
          <h3>語意分類</h3>
          <p>分類依詞性、句內語意角色、群組主體性與符文語意逐層判定。名稱與關鍵詞是證據，不是單字命中就直接決定分類。</p>
        </article>
        <article className="loc-card">
          <h3>Current 與歷史</h3>
          <p>Current 只使用現行名稱、定義與 Grammar。歷史版本與舊狀態保留 provenance，但不重新取得 Current authority。</p>
        </article>
        <article className="loc-card">
          <h3>Scope 邊界</h3>
          <p>LunaRunes 的資料、文化、脈絡、統計與治理屬自己的 Scope；可以和 LOC 共用 Feature，但不因此失去自己的資料與治理權。</p>
        </article>
      </div>
    </section>

    <section className="loc-card" id="settings">
      <p className="loc-eyebrow">Settings</p>
      <h2>設定</h2>
      <p>這裡只管理 LunaRunes Scope 的預設設定，不影響其他 Scope。使用者自己的風格切換統一放在 Footer。</p>
      <div className="loc-grid two">
        <article className="loc-card">
          <h3>Theme</h3>
          <p>管理者決定 LunaRunes 的預設風格；使用者可在 Footer 自由切換。</p>
          <div className="loc-actions"><a className="loc-button" href="https://admin.lo3rwang.cc/management/themes">管理預設風格</a></div>
        </article>
        <article className="loc-card">
          <h3>語系</h3>
          <LocaleControl/>
        </article>
      </div>
      <div className="loc-actions">
        <a className="loc-button primary" href="https://admin.lo3rwang.cc/">最高管理</a>
      </div>
    </section>
  </section></main>;
}
