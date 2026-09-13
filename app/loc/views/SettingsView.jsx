'use client';

import ThemeControl from '../ThemeControl';

export default function SettingsView(){
  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Settings · 使用者設定</p>
      <h1>設定</h1>
      <p>集中管理顯示、個人化、時期與資料存取等使用者層功能。</p>
    </header>

    <section className="loc-card">
      <p className="loc-eyebrow">Display · 顯示</p>
      <h2>顯示與主題</h2>
      <ThemeControl />
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Personal · 個人化</p>
      <h2>風格與時期</h2>
      <div className="loc-actions">
        <a className="loc-button" href="/my-style">個人風格</a>
        <a className="loc-button" href="/evolution">ERA／時期</a>
        <a className="loc-button" href="/style-groups">群組設定</a>
        <a className="loc-button" href="/classify">分類</a>
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Data · 資料</p>
      <h2>Database 與匯入／匯出</h2>
      <p>本機資料、JSON 匯入／匯出與 Google Drive 手動備份／讀回由 Database 管理，不做背景同步。</p>
      <div className="loc-actions">
        <a className="loc-button primary" href="/library">開啟 Database</a>
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Boundary · 邊界</p>
      <h2>設定只作用在使用者層</h2>
      <p>這裡不提供 LunaRunes 內部資料編輯。符文名稱、編號、正式分組、關鍵詞、位向規則、Canon 與母資料仍由治理與 canonical data 管理。</p>
    </section>
  </section>;
}
