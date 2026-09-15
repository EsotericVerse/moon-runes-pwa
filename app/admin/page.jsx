export const metadata={title:'統籌｜Esoteric Verse Admin'};

const areas=[
  ['Organization','組織與成員的最高層治理邊界。'],
  ['Domains','管理完整網域、canonical、alias、redirect 與服務對應；不綁定特定 TLD。'],
  ['Services','登錄 LOC 與未來其他服務。'],
  ['Routes','建立並管理 Service → Route → Page 對應。'],
  ['Permissions','指派組織、服務與 Page Manager 權限。'],
  ['Data Admission','新資料 Upload / Import / Ingest、驗證與 staging。'],
  ['Global Blacklist','組織層封鎖規則；分頁治理不得覆寫。'],
  ['Audit & Publish','完整稽核、全域 Publish / Rollback 與版本狀態。']
];

export default function AdminPage(){
  return <main className="loc-view">
    <header className="loc-hero" id="top">
      <p className="loc-eyebrow">Admin · Organization Control Plane</p>
      <h1>統籌</h1>
      <p className="loc-subtitle">Organization → Domain → Service → Route → Page</p>
    </header>
    <section className="loc-card">
      <h2>Esoteric Verse</h2>
      <p>Organization 是系統邊界；Domain 是可配置資源，不把組織身分綁定在單一網域或 TLD。</p>
    </section>
    <div className="loc-grid two">
      {areas.map(([title,description])=><section className="loc-card" key={title}><h2>{title}</h2><p>{description}</p></section>)}
    </div>
  </main>;
}
