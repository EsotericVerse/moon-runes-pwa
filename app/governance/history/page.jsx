import {featureHrefV2,scopeHrefV2} from '../../modular-v2/scope-registry.v2';

export const metadata={title:'治理紀錄｜LOC 月典'};

export default function GovernanceHistoryPage(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Governance Audit Trail</p><h1>治理紀錄</h1><p className="loc-subtitle">保留發生過的治理事實，不以 Current 定義覆寫歷史</p></header>
    <section className="loc-card"><h2>不可改寫的稽核邊界</h2><p>每筆治理動作應保存 Scope、治理對象、操作者角色、動作、變更前後值、理由、證據、時間、審核狀態與替代紀錄。錯誤以更正或 supersede 新增紀錄，不靜默改寫原紀錄。</p><p>管理者可以治理哪些歷史資料被 Current 採用、分析或公開呈現；這項選擇本身也必須留下治理紀錄。</p><div className="loc-actions"><a className="loc-button" href={scopeHrefV2('admin')}>前往管理者功能</a><a className="loc-button" href={featureHrefV2('loc','governance')}>返回治理首頁</a></div></section>
  </section></main>;
}
