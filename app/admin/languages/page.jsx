import LanguageSettingsManager from './LanguageSettingsManager';

export const metadata={title:'語系設定｜Admin｜LOC 月典',robots:{index:false,follow:false}};

export default function LanguagesAdminPage(){
  return <main className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Language</p>
      <h1>語系設定</h1>
      <p className="loc-subtitle">管理網站預設語系；目前支援繁體中文與 English。</p>
      <div className="links"><a href="/admin">回全站管理</a></div>
    </header>
    <LanguageSettingsManager/>
  </main>;
}
