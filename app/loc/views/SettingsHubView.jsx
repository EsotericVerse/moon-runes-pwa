'use client';

import ThemeControl from '../ThemeControl';

export default function SettingsHubView(){
  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Settings</p>
      <h1>設定</h1>
      <p>顯示、個人化、時期與資料操作集中在這裡。</p>
    </header>

    <section className="loc-card">
      <p className="loc-eyebrow">Display</p>
      <h2>顯示與主題</h2>
      <ThemeControl />
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Personal</p>
      <h2>個人化</h2>
      <div className="loc-actions">
        <a className="loc-button" href="/style">個人風格</a>
        <a className="loc-button" href="/evolution">ERA／時期</a>
        <a className="loc-button" href="/style-groups">群組設定</a>
        <a className="loc-button" href="/classify">分類</a>
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Data</p>
      <h2>Database 與匯入／匯出</h2>
      <p>JSON 匯入／匯出與 Google Drive 手動備份／讀回放在 Database。</p>
      <div className="loc-actions">
        <a className="loc-button primary" href="/library">Database</a>
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Scope</p>
      <h2>設定範圍</h2>
      <p>設定只處理使用者偏好與資料操作；月之符文核心資料維持唯讀。</p>
    </section>
  </section>;
}
