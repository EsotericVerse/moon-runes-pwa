import LocSystemQuickLinks from '../../LocSystemQuickLinks';
import ThemeControl from '../ThemeControl';
import LocaleControl from '../LocaleControl';
import { PageComposition } from '../../PageComposition';

const PRINCIPLES = [
  ['客觀與中立（Objectivity and Neutrality）','依資料、語境與公開規則判定；分析結果與作者、管理者或使用者的價值判斷分開。'],
  ['可解釋（Explainability）','判定保留規則版本、證據、候選與排除理由；可直接說明時，不以不可追溯的結果取代。'],
  ['範圍與權威（Scope and Authority）','先確認資料範圍，再依 Master Data、Canon、Spec、Registry、來源紀錄與衍生 View 的責任順序判定。衍生資料不得覆寫上游權威。'],
  ['同原則、不同主體','LOC 提供共同治理方法與分類框架；LunaRunes、Author 與其他 Scope 可以共用相同原則，但各自管理不同主體、資料與權威。'],
  ['漸進式揭露（Progressive Disclosure）','使用者不需要先理解整套 LOC、所有 LunaRunes 或作者全部作品。可從有興趣的 Feature 進入，再依需要逐步展開底層結構與治理資訊。'],
  ['現行與歷史（Current and Historical）','Current 只採用目前有效定義；歷史紀錄不可改寫。採用或呈現哪些歷史資料，由相應 Scope 管理者治理並留下紀錄。'],
  ['治理先於實作','先確定名稱、語意、權威與邊界，再更新程式、介面、索引、JSON、搜尋或推演；既有程式不得反向凍結治理。'],
  ['語意優先與分類一致性','分類依詞性／句內角色、主體性與所屬語意逐層判定，不以單字命中代替語意。需要唯一值時給出一個 Current 結果；接近候選另標爭議。'],
  ['資料歸屬與寫入審核','個人、符文、治理、作品及組織等 Scope 各自保有資料、搜尋、統計與排行榜。月典結果是統合層；跨 Scope 寫入必須經目標 Scope 審核。'],
  ['可移植（Portable）','LOC 的原則、資料契約與治理模型不依附特定網站、平台、框架、主機、資料庫或供應商；實作可以替換。'],
  ['多層治理與獨立管理','Scope 可依個人、群組、部門或組織新增、刪除、拆分、合併與調整，不存在永久唯一的 Scope 清單。每個 LOC instance 的管理權獨立；採用 LOC 不授予 LOC 作者登入權。'],
  ['多層搜尋與統計','查詢、統計與排行榜必須標明 Scope 與資料歸屬。統合結果不得抹除來源，也不得把可讀取誤當成可寫入。'],
  ['增量處理','首次進行完整分析；同筆資料未變則跳過，有差異才更新，修正標記只觸發相關局部重算。排行榜保存 Current count 並作差異更新，避免反覆全文搜尋。'],
  ['時期獨立（ERA by Scope）','ERA 屬於各自 Scope，可由該 Scope 治理修改；個人、符文、治理或組織的時期不得混成一條時間線。'],
  ['角色分離','作者、資料主體、Scope 管理者與系統管理者是不同角色；管理資料不等於取得作者身分、觀點代表權或其他 instance 的權限。'],
  ['單一導覽（Single NAV）','每個介面只有一條正式 NAV；本地入口、架構圖與快捷功能不是 NAV2 或 NAV3。導覽文字可由所屬 Scope 治理，但不得冒充全域名稱。'],
  ['衝突不猜測','權威不足、來源矛盾或規則不能判定時，標記待治理、保留證據，不拼湊看似完整的答案。']
];

const SECTIONS = [
  {
    id:'principles',
    eyebrow:'Governance',
    title:'治理概念',
    subtitle:'先確認 Scope、權威與責任，再決定資料怎麼被使用、呈現與修改。',
    content:<>
      <p className="loc-core-line"><strong>鑑古知今，求同存異</strong><br/><strong>不在其位，不謀其政</strong><br/><strong>隨心所欲，而不逾己</strong></p>
      <details>
        <summary>查看完整 Current 治理原則</summary>
        <div className="loc-rule-list">{PRINCIPLES.map(([title,body])=><p key={title}><strong>{title}</strong><br/>{body}</p>)}</div>
      </details>
      <p>歷史資料必須保留，但歷史語意不得重新取得 Current authority。版本、舊名稱與形成過程屬 provenance；Current 只採目前有效定義。</p>
      <div className="loc-actions">
        <a className="loc-button" href="/governance/history">歷史與治理紀錄</a>
      </div>
    </>
  },
  {
    id:'copyleft',
    eyebrow:'Legal / Copyleft',
    title:'法律與授權宣告',
    subtitle:'方法可以學，來源要保留；資料權、治理權、作者身分與商業權責分開。',
    content:<>
      <p>LOC 以 Copyleft 為根本方向：基本方法論可供研究、理解與延伸，但必須保留必要來源、作者與修改標示；衍生商業使用與專業實作依個案另行治理。</p>
      <p>採用 LOC 不代表取得作者身分、其他 Scope 的資料所有權、寫入權或治理權；授權與 Scope Authority 是不同層次。</p>
    </>,
    links:[
      {href:'/governance#copyleft',label:'查看授權說明',text:'查看 Copyleft、來源標示與商業使用相關說明。'}
    ]
  },
  {
    id:'settings-management',
    eyebrow:'Settings / Management',
    title:'設定管理',
    subtitle:'主站自己的顯示與管理選項留在治理頁；最高層系統管理才進入 admin.lo3rwang.cc。',
    content:<>
      <div className="loc-grid two">
        <section className="loc-card">
          <h3>顯示與 Theme</h3>
          <p>全站共用同一套 CSS 與 Theme Registry；此處調整目前 Scope 的顯示模式。</p>
          <ThemeControl />
          <LocaleControl />
        </section>
        <section className="loc-card">
          <h3>主站管理</h3>
          <p>管理主站 Scope 的資料、時期、分類與其他 Current 設定。這些設定不取得其他 Scope 的治理權。</p>
          <div className="loc-actions">
            <a className="loc-button" href="/library">資料庫</a>
            <a className="loc-button" href="/style-groups">群組設定</a>
            <a className="loc-button" href="/classify">分類</a>
          </div>
        </section>
      </div>
      <section className="loc-card">
        <h3>最高管理</h3>
        <p><code>admin.lo3rwang.cc</code> 是特殊的最高管理入口；它不取代各 Scope 自己的治理頁。</p>
        <div className="loc-actions"><a className="loc-button primary" href="https://admin.lo3rwang.cc/">開啟最高管理</a></div>
      </section>
    </>
  }
];

export default function GovernanceView(){
  return <PageComposition
    eyebrow="Governance"
    title="治理"
    subtitle="治理概念、法律宣告與設定管理都回到主站治理頁；最高系統管理另由 admin.lo3rwang.cc 承接。"
    intro={<>
      <LocSystemQuickLinks />
      <p>LOC Governance 是月典主站的治理入口：總覽 Current 原則、Scope 關係、權威邊界、授權與主站設定；LunaRunes、個人網頁與其他 Scope 仍治理自己的資料。</p>
      <p className="loc-core-line">Current Canon → Scope Model × Feature Model → Page Composition</p>
    </>}
    sections={SECTIONS}
  />;
}
