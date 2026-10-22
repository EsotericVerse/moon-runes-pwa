'use client';

// Shared header for the three management pages (Admin / Scope management /
// Settings): one glyph, the section name and a one-line purpose.
const META=Object.freeze({
  registry:['👥','群組人員管理','管理群組、人員與各自的管理權限'],
  sources:['🧭','來源設定','整理文章來源分類與對應規則'],
  themes:['🎨','主題顏色設定','調整全站主題色彩，所有頁面同步套用'],
  featureHero:['🖼️','功能區塊設定','設定各功能頁頂部的文字與圖片'],
  system:['⚙️','系統設定','資料庫目標與帳號封鎖清單'],
  settings:['🛠️','Scope 設定','這個 Scope 的名稱、頁面與基本設定'],
  publisher:['✍️','發表文章','在這個 Scope 寫作並發表新文章'],
  import:['📥','資料匯入','匯入檔案、更新來源、清理重複內容'],
  home:['🏠','首頁設定','選擇登入後預設進入的首頁'],
  dailyRune:['🌙','每日符文紀錄','查看、修改與備份每天抽到的符文'],
  files:['📥','文件匯入','把文件匯入你管理的 Scope'],
  account:['👤','帳號','登入狀態與登出'],
  manage:['📁','裝置檔案','管理這支手機上的本機檔案']
});

export default function SectionBanner({id}){
  const meta=META[id];
  if(!meta)return null;
  return <section className="loc-card scope-section-banner" aria-label={meta[1]}>
    <span className="scope-section-banner__glyph" aria-hidden="true">{meta[0]}</span>
    <div className="scope-section-banner__copy">
      <h2>{meta[1]}</h2>
      <p>{meta[2]}</p>
    </div>
  </section>;
}
