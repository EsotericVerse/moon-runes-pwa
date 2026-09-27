'use client';

import {selectNeonRows} from '../../loc/neon-repository';
import {useOffsetPagination} from '../use-offset-pagination.v2';
import FeaturePageV2 from '../FeaturePageV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const FAQ_PAGE_SIZE=10;
function faqQuestion(row,index){
  return row?.question||row?.title||row?.prompt||row?.faq_question||`問題 ${index+1}`;
}
function faqAnswer(row){
  return row?.answer||row?.content||row?.body||row?.faq_answer||row?.description||'';
}
function faqCategory(row){
  return row?.category||row?.group_name||row?.section||row?.scope||'FAQ';
}

function FaqView(){
  const page=useOffsetPagination({
    key:'governance-faq',
    pageSize:FAQ_PAGE_SIZE,
    loadPage:async(offset,limit)=>{
      const result=await selectNeonRows('silver.faq_entries',{
        columns:'faq_id,category,question,answer',
        orders:[{column:'category',ascending:true},{column:'faq_id',ascending:true}],
        offset,
        limit
      });
      return {rows:result.rows,hasMore:result.rows.length===limit};
    }
  });
  const {rows,loading,error,hasMore}=page;

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">FAQ</p>
      <h1>常見問題</h1>
    </header>
    {loading&&!rows.length?<p className="scope-v2-status">載入 FAQ…</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error.message}</p>:null}
    {!loading&&!error&&!rows.length?<p>目前沒有 FAQ 資料。</p>:null}
    <div className="loc-grid two">
      {rows.map((row,index)=><article className="loc-card" key={row?.faq_id||row?.id||row?.faq_key||index}>
        <p className="loc-eyebrow">{faqCategory(row)}</p>
        <h2>{faqQuestion(row,index)}</h2>
        <p>{faqAnswer(row)}</p>
      </article>)}
    </div>
    {hasMore?<div className="scope-v2-load-sentinel" aria-live="polite">
      &lt; {loading?'載入中…':'…'} &gt;
    </div>:null}
  </section>;
}

function LocGovernance(){
  return <>
    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <p className="loc-eyebrow">LOC Principles</p>
        <h2>原則</h2>
        <p className="loc-core-line">尊重 · 和平 · 包容 · 友善</p>
        <p><strong>LOC 本身保持客觀與中立。</strong>它整理語言、資料、脈絡與時間，但不替使用者決定立場、身份或人生選擇。</p>
        <p>LOC 可以被使用、比較、延伸，也可以完全不用；系統提供的是架構與方法，不是唯一答案。</p>
        <p><strong>歷史保留，解釋可校準。</strong>事件、來源與版本保留；定義、方法與解釋可依證據、脈絡與需求重新檢視。</p>
      </section>
      <section className="loc-card" id="scope-boundary">
        <p className="loc-eyebrow">Scope Governance</p>
        <h2>治理邊界</h2>
        <p>每個 Scope 擁有自己的資料與治理權。跨 Scope 可以引用、連結與比較，但不因此取得對方治理權。</p>
        <p>LOC 的授權條件只適用於 LOC 自己有權授權的內容，不會因為 LunaRunes 或 lo3rwang 被 LOC 索引、展示或分析，就把 LOC 的授權自動套到它們身上。</p>
      </section>
    </div>
    <LocLawPanel/>
  </>;
}

function LocLawPanel(){
  return <div className="loc-grid two">
    <section className="loc-card" id="copyright">
      <p className="loc-eyebrow">Copyleft · GNU GPL</p>
      <h2>LOC 授權</h2>
      <p>LOC 採 <strong>Copyleft</strong> 原則；LOC 的原創程式碼採 <strong>GNU GPL</strong> 授權。GPL 的正式版本與完整條款以 Repository 的 LICENSE 文件為準。</p>
      <p>LOC 的方法、架構與可授權內容可以被研究、使用與延伸，但應保留來源、作者、修改歷史與必要的衍生標示。</p>
      <p>這個授權邊界只屬於 LOC，不自動涵蓋 LunaRunes、lo3rwang 個人作品、第三方內容、私人資料或另有權利條件的資產。</p>
    </section>
    <section className="loc-card" id="documents">
      <p className="loc-eyebrow">Documents</p>
      <h2>文件</h2>
      <p><a href="https://github.com/EsotericVerse/moon-runes-pwa">Repository 文件入口</a>：README、Copyleft 與 GPL 授權文件由 Repository 統一管理。</p>
      <p><a href="/docs/LOC_Canon.docx">LOC Canon</a>：LOC 現行架構、定義與治理基準。</p>
    </section>
  </div>;
}

function LunaRunesGovernance(){
  return <>
    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <p className="loc-eyebrow">LunaRunes Governance</p>
        <h2>符號式語言治理</h2>
        <p>LunaRunes（月之符文）是 <strong>Symbolic Language／符號式語言</strong>，因此使用自己的符號、Canon、引用與衍生治理方式。</p>
        <p>符文、抽籤與籤詩的分析只供參考，不是命令，也不是唯一答案。Current 定義使用現行正式符文名稱與規則；歷史版本保留演變，但不反向污染 Current Canon。</p>
      </section>
      <section className="loc-card" id="rights">
        <p className="loc-eyebrow">Rights · Scope</p>
        <h2>權利邊界</h2>
        <p>LunaRunes <strong>不採 LOC 的 Copyleft，也不採 LOC 的 GNU GPL</strong>。</p>
        <p>引用、改作、衍生、再利用與商業使用，依 LunaRunes 自己的治理規則與作者明示授權處理；被 LOC 收錄、搜尋或分析，不會改變 LunaRunes 的權利狀態。</p>
      </section>
    </div>
  </>;
}

function AuthorGovernance(){
  return <>
    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <p className="loc-eyebrow">Personal Governance</p>
        <h2>個人治理</h2>
        <p>lo3rwang Scope 處理 Lucas Oscar Wang 政德的個人資料、作品、公開文字與創作軌跡。</p>
        <p>LOC 可以整理、搜尋與呈現這些資料，但不因資料進入 LOC，就改變原作品的作者權利或個別授權條件。</p>
      </section>
      <section className="loc-card" id="rights">
        <p className="loc-eyebrow">Copyright · Personal Works</p>
        <h2>作品與資料權利</h2>
        <p>lo3rwang 的個人作品與資料 <strong>不採 LOC 的 Copyleft，也不採 LOC 的 GNU GPL</strong>。</p>
        <p>文字、歌曲、小說、多媒體與其他作品依各作品原有標示、來源與作者授權處理；未特別開放的內容，不因 LOC 的開放治理而自動取得相同授權。</p>
      </section>
    </div>
  </>;
}

function GovernanceBody({scopeId}){
  if(scopeId==='lunarunes')return <LunaRunesGovernance/>;
  if(scopeId==='lo3rwang')return <AuthorGovernance/>;
  return <LocGovernance/>;
}

function GovernanceHome(){
  const {scopeId}=useScopeRuntimeV2();
  const subtitle=scopeId==='lunarunes'
    ?'符號式語言的治理、Canon 與權利邊界。管理也在此。'
    :scopeId==='lo3rwang'
      ?'個人治理、作品與作者權利。管理也在此。'
      :'LOC 原則、Copyleft 與 GNU GPL。管理也在此。';
  return <FeaturePageV2 featureId="governance" subtitle={subtitle}>
    <GovernanceBody scopeId={scopeId}/>
  </FeaturePageV2>;
}

function GovernanceLaw(){
  const {scopeId}=useScopeRuntimeV2();
  return <FeaturePageV2 featureId="governance" subtitle="權利與授權">
    {scopeId==='lunarunes'
      ?<LunaRunesGovernance/>
      :scopeId==='lo3rwang'
        ?<AuthorGovernance/>
        :<LocLawPanel/>}
  </FeaturePageV2>;
}

export default function GovernanceV2({section=null}){
  if(section==='faq')return <FaqView/>;
  if(section==='law')return <GovernanceLaw/>;
  return <GovernanceHome/>;
}
