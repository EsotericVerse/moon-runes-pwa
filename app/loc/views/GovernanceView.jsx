const PRINCIPLES=[
 ['客觀與中立（Objectivity and Neutrality）','依資料、語境與公開規則判定；分析結果與作者、管理者或使用者的價值判斷分開。'],
 ['範圍與權威（Scope and Authority）','先確認資料範圍，再依相應權威來源判定；衍生資料不得覆寫上游權威。'],
 ['現行與歷史（Current and Historical）','Current 只採用目前有效定義；歷史紀錄不可改寫。'],
 ['治理先於實作','先確定名稱、語意、權威與邊界，再更新程式、介面、索引、搜尋或推演。'],
 ['資料歸屬與寫入審核','各 Scope 保有自己的資料、搜尋、統計、文化與治理；整合不轉移歸屬。'],
 ['單一導覽（Single NAV）','NAV 由目前 Scope 生成；功能 route 不改變 Scope。']
];
export default function GovernanceView(){return <section className="loc-view">
 <header className="loc-hero" id="top"><p className="loc-eyebrow">LOC Governance · Current</p><h1>治理</h1><p className="loc-subtitle">月典自己的治理與管理。</p></header>
 <section className="loc-card" id="principles"><p className="loc-eyebrow">Principles</p><h2>Current 治理原則</h2><div className="loc-rule-list">{PRINCIPLES.map(([title,body])=><p key={title}><strong>{title}</strong><br/>{body}</p>)}</div></section>
 <section className="loc-card" id="governance-actions"><p className="loc-eyebrow">Administration</p><h2>管理入口</h2><div className="loc-link-list"><a className="loc-link-card" href="https://admin.lo3rwang.cc/"><strong>系統最高管理者設定</strong><span>查看最高管理者、目前 Scope 與系統 Library。現階段唯讀。</span></a></div></section>
 </section>}
