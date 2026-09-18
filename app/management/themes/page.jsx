import ThemeRegistryManager from './ThemeRegistryManager';

export const metadata={title:'主題設定｜管理者｜LOC',robots:{index:false,follow:false}};

export default function ManagementThemesPage(){
  return <main className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Management · Theme Registry</p>
      <h1>主題設定</h1>
      <p className="loc-subtitle">管理 8 種固定 Theme、隨時間模式與第九種自訂。全站仍共用同一套 CSS 與 Theme token。</p>
    </header>
    <ThemeRegistryManager/>
  </main>;
}
