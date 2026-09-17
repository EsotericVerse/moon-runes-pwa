export const metadata={
  title:'使用中模組｜Admin｜LOC 月典',
  robots:{index:false,follow:false}
};

const groups=[
  ['核心架構',[
    ['Page Composition','Scope × Feature → Page Composition','/'],
    ['NAV / Domain Resolver','Domain 優先，目錄其次','/'],
    ['Route / Page Registry','階層 route、manager route、page ownership','/admin/routes']
  ]],
  ['治理與資料',[
    ['Domain Registry','Scope domain identity 與 canonical host','/admin/domains'],
    ['Source Registry','來源、同步、temporary/private ingestion','/admin/sources'],
    ['Content / Authorship','內容、作者、contributor、publisher、steward 分離','/admin/content'],
    ['Projection Registry','visibility、projection、search/statistics/semantic/ranking/trend 控制','/admin/projection'],
    ['Audit Registry','治理與修改紀錄','/admin/audit'],
    ['Governance','全域治理與 freeze/override','/governance']
  ]],
  ['語言與分析',[
    ['Search','跨 Scope / Feature 查詢','/search'],
    ['Context','脈絡、Graph、Event / Relation','/context'],
    ['Statistics','統計與排行讀取模型','/statics'],
    ['Evolution / ERA','時期、趨勢與演化','/evolution'],
    ['Classify','語意分類','/classify'],
    ['Dual Semantic Engine','雙語意引擎與語意 projection','/management']
  ]],
  ['內容與創作',[
    ['LunaRunes','語彙、圖鑑、抽牌與符文 read models','https://lrunes.lo3rwang.cc'],
    ['Writing','文字作品與分析','/writing'],
    ['Multimedia','多媒體表達','/multimedia'],
    ['Galaxy','關聯視覺化','/galaxy'],
    ['Game','脈絡遊戲 / Current Alpha','/game'],
    ['lo3rwang','個人 Scope','https://lo3rwang.lo3rwang.cc']
  ]]
];

export default function ModulesPage(){
  return <main className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Admin · Read Model</p>
      <h1>使用中模組</h1>
      <p className="loc-subtitle">目前 Next.js 實際使用中的模組與入口。此頁只做盤點，不取代各 registry / manifest 的治理 authority。</p>
      <div className="links"><a href="/admin">回全站管理</a></div>
    </header>
    {groups.map(([group,items])=><section className="loc-card" key={group}>
      <h2>{group}</h2>
      <div className="loc-table-wrap">
        <table className="loc-table">
          <thead><tr><th>模組</th><th>用途</th><th>入口</th></tr></thead>
          <tbody>{items.map(([name,purpose,href])=><tr key={`${group}:${name}`}><td>{name}</td><td>{purpose}</td><td><a href={href}>{href}</a></td></tr>)}</tbody>
        </table>
      </div>
    </section>)}
  </main>;
}
