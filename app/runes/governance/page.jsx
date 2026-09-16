export const metadata={title:'治理｜月之符文',description:'月之符文 Scope 的獨立治理。'};
const ITEMS=[
  ['符文資料','治理月之符文自己的 Master Data、名稱、群組與正式定義。'],
  ['語意邊界','治理符文的語意邊界、分類原則與可解釋判定。'],
  ['閱讀規則','治理卡牌方向、月相交互與單卡、雙卡、三卡、五卡、11 卡閱讀結構。'],
  ['時期設定','月之符文的時期在脈絡頁展示；時期的新增、調整與 Current 選擇在治理層進行。'],
  ['歷史與 Current','歷史保留，公開主要顯示使用目前正式版本；治理變更不得改寫既有歷史。']
];
export default function Page(){return <main className="loc-next-main"><header className="loc-hero"><p className="loc-eyebrow">LunaRunes · Governance</p><h1>月之符文治理</h1><p>這裡只治理月之符文 Scope。治理方法可以與其他 Scope 共用，但治理資料、說明與權限彼此獨立。</p></header><section className="loc-card"><h2>治理範圍</h2><div className="loc-card-grid">{ITEMS.map(([title,text])=><article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section><section className="loc-card"><h2>修改權限</h2><p>公開頁面負責展示治理說明；需要修改治理資料時，必須先完成 OAuth 身分驗證，再依月之符文 Scope 的管理權限判定是否允許寫入。</p></section></main>}
