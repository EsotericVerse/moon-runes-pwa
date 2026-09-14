import ThemeControl from '../ThemeControl';
import LocaleControl from '../LocaleControl';

export default function SettingsView(){
  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Settings</p>
      <h1>設定</h1>
      <p className="loc-subtitle">集中管理網站顯示方式與使用者層的個人設定。</p>
    </header>

    <section className="loc-card">
      <p className="loc-eyebrow">Display</p>
      <h2>顯示與主題</h2>
      <p className="loc-subtitle">調整網站的語系與白天、夜晚顯示方式。</p>
      <ThemeControl />
      <LocaleControl />
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Personal</p>
      <h2>風格與時期</h2>
      <p className="loc-subtitle">管理個人風格、時期、群組規則與文字分類。</p>
      <div className="loc-actions">
        <a className="loc-button" href="/my-style">個人風格</a>
        <a className="loc-button" href="/evolution">時期</a>
        <a className="loc-button" href="/style-groups">群組設定</a>
        <a className="loc-button" href="/classify">分類</a>
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Data</p>
      <h2>資料與匯入／匯出</h2>
      <p className="loc-subtitle">管理本機資料、JSON 匯入匯出，以及手動備份與讀回。</p>
      <div className="loc-actions">
        <a className="loc-button primary" href="/library">開啟資料庫</a>
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Boundary</p>
      <h2>使用者設定的範圍</h2>
      <p className="loc-subtitle">使用者設定只影響顯示與個人資料，不修改月之符文的正式定義。</p>
      <p>這裡不提供 LunaRunes 內部資料編輯。符文名稱、編號、正式分組、關鍵詞、位向規則、Canon 與母資料仍由治理與 canonical data 管理。</p>
    </section>
  </section>;
}
