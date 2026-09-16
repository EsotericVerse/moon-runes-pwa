const PRINCIPLES=[
 ['不替使用者裁定','提供可檢驗的資訊、規則、來源、脈絡、差異、不確定性與爭議；使用者可以贊同，也可以反對。'],
 ['客觀與中立','以客觀與中立為治理目標，但不宣稱能達成完全客觀；揭露依據、範圍、限制與不確定性。'],
 ['範圍與權威','先確認資料範圍，再依相應權威來源判定；衍生資料不得覆寫上游權威。'],
 ['現行與歷史','Current 只採用目前有效定義；歷史紀錄保留，不反向覆蓋 Current。'],
 ['治理先於實作','先確定名稱、語意、權威與邊界，再更新現行內容。'],
 ['資料歸屬與寫入審核','各 Scope 保有自己的資料與治理權威；整合不轉移歸屬。'],
 ['語意遷移完整性','Current 正式變更後，所有現行內容同步遷移；舊語意只保留於 Historical／Legacy。'],
 ['單一導覽','每個介面只有一條正式 NAV；切換 Scope 後使用該 Scope 的導覽。'],
 ['可移植','LOC 不依附單一平台、框架、CMS 或部署服務。'],
 ['Copyleft','基本方法論開放使用與研究；衍生時保留必要來源、作者、歷史與修改標示，衍生商業使用須取得同意。']
];

export default function GovernanceView(){return <section className="loc-view">
 <header className="loc-hero" id="top"><p className="loc-eyebrow">Current</p><h1>治理</h1></header>
 <section className="loc-card" id="principles"><h2>Current 治理原則</h2><div className="loc-rule-list">{PRINCIPLES.map(([title,body])=><p key={title}><strong>{title}</strong><br/>{body}</p>)}</div></section>
 <section className="loc-card" id="governance-actions"><h2>管理入口</h2><div className="loc-link-list"><a className="loc-link-card" href="https://admin.lo3rwang.cc/"><strong>系統管理</strong><span>目前設定與管理入口</span></a></div></section>
 </section>}
