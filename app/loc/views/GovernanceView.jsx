'use client';

import {PageComposition} from '../../PageComposition';
import {useCurrentScope} from '../../use-current-scope';
import {getScopePageProfile} from '../../scope-page-profiles';

const PRINCIPLES=[
  ['客觀與中立（Objectivity and Neutrality）','依資料、語境與公開規則判定；分析結果與作者、管理者或使用者的價值判斷分開。'],
  ['可解釋（Explainability）','判定保留規則版本、證據、候選與排除理由；可直接說明時，不以不可追溯的結果取代。'],
  ['範圍與權威（Scope and Authority）','先確認資料範圍，再依 Master Data、Canon、Spec、Registry、來源紀錄與衍生 View 的責任順序判定。衍生資料不得覆寫上游權威。'],
  ['同原則、不同主體','共用治理方法不等於共用資料所有權；每個 Scope 各自管理自己的主體、資料與權威。'],
  ['漸進式揭露（Progressive Disclosure）','使用者可從任一 Feature 進入，再依需要逐步展開底層結構與治理資訊。'],
  ['現行與歷史（Current and Historical）','Current 只採用目前有效定義；歷史紀錄不可改寫，也不得重新升格為 Current。'],
  ['治理先於實作','先確定名稱、語意、權威與邊界，再更新程式、介面、索引、JSON、搜尋或分析。'],
  ['資料歸屬與寫入審核','跨 Scope 可讀取、分析與統合，不代表取得寫入權；跨 Scope 寫入必須經目標 Scope 審核。'],
  ['單一導覽（Single NAV）','每個介面只有一條正式 NAV；頁內功能選單與快捷入口不是第二套 NAV。'],
  ['衝突不猜測','權威不足、來源矛盾或規則不能判定時，標記待治理並保留證據。']
];

export default function GovernanceView(){
  const {scope,current}=useCurrentScope();
  const profile=getScopePageProfile(scope,'governance');

  const sections=[
    {
      id:'scope',
      eyebrow:'Scope Authority',
      title:profile.scopeTitle,
      subtitle:current.label,
      content:<><p className="loc-core-line">{profile.authority}</p><p>{profile.scopeText}</p></>,
      links:profile.links
    },
    {
      id:'principles',
      eyebrow:'Shared Principles',
      title:'共用治理原則',
      subtitle:'規格共用；治理主體、資料與權威不合併。',
      content:<>
        <p className="loc-core-line"><strong>鑑古知今，求同存異</strong><br/><strong>不在其位，不謀其政</strong><br/><strong>隨心所欲，而不逾己</strong></p>
        <details><summary>查看 Current 治理原則</summary><div className="loc-rule-list">{PRINCIPLES.map(([title,body])=><p key={title}><strong>{title}</strong><br/>{body}</p>)}</div></details>
      </>
    },
    {
      id:'history',
      eyebrow:'Current / Historical',
      title:'現行與歷史',
      subtitle:'歷史保留，Current 收斂。',
      content:<p>歷史資料本身不是污染；只有舊語意、舊路由、舊 runtime 或舊 contract 被重新當作 Current 權威時才形成污染。Current 由現行 Registry／Canon／Spec 派生，歷史差異交給 Git、稽核紀錄與來源資料保存。</p>
    }
  ];

  return <PageComposition
    eyebrow={profile.eyebrow}
    title={profile.title}
    subtitle={profile.subtitle}
    intro={<><p>{profile.intro}</p><p className="loc-core-line">{profile.authority}</p></>}
    sections={sections}
  />;
}
