'use client';

import {selectNeonRows} from '../../loc/neon-repository';
import {useOffsetPagination} from '../use-offset-pagination.v2';
import FeaturePageV2 from '../FeaturePageV2';

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

function PrinciplesPanel(){
  return <div className="loc-grid two">
    <section className="loc-card" id="principles">
      <p className="loc-eyebrow">Principles</p>
      <h2>原則</h2>
      <p className="loc-core-line">尊重 · 和平 · 包容 · 友善</p>
      <p><strong>LOC 本身保持客觀與中立。</strong>它不預設宗教、政治、道德或人生價值立場，也不要求使用者接受作者本人的信仰、觀念或生活方式。</p>
      <p>LOC 有自己的語言框架、分析方式、資料治理方法與表達調性；這些屬於系統特性，不等於要求他人認同。任何人都可以選擇使用、部分使用、引用、改寫、比較，或完全不用。</p>
      <p>月之符文保留符文、抽籤與籤詩的文化與創作形式，但分析只是參考，不是命令，也不是唯一答案。系統不得以多數意見、社會期待、宗教權威、道德壓力或情緒施壓取代使用者自己的判斷。</p>
      <p><strong>歷史保留，解釋可校準。</strong>LOC 不以新版本抹除舊版本，也不因歷史存在就把舊定義視為永久真理。事件、來源與版本應保留；定義、方法與解釋可依證據、脈絡與需求重新檢視。</p>
    </section>

    <section className="loc-card" id="philosophy">
      <p className="loc-eyebrow">Tone · Governance</p>
      <h2>治理態度</h2>
      <p><strong>尊重、和平、包容、友善。</strong></p>
      <p>這四個詞描述 LOC 對外互動的基本態度，而不是一套要求他人遵守的人生教條。LOC 的框架可以有明確邊界，分析可以有清楚規則，但不以強迫採用、排斥異見或建立唯一正統為目標。</p>
      <p>LOC 提供的是一套可參考、可檢查、可延伸的語言系統方法。使用者保有自己的主權與判斷；系統則保有自己的資料規格、方法邊界與版本紀錄。</p>
      <p>可以參考，不必服從；可以延伸，不必成為同一套思想；只希望在使用與引用時尊重來源，遵守 Copyleft 與作者署名原則。</p>
    </section>
  </div>;
}

function LawPanel(){
  return <div className="loc-grid two">
    <section className="loc-card" id="copyright">
      <p className="loc-eyebrow">Copyright · Copyleft</p>
      <h2>版權</h2>
      <p>LOC 與 LunaRunes 採 <strong>Copyleft</strong> 思路公開核心內容。歡迎閱讀、研究、參考與依既有授權條件延伸，但來源、作者姓名與原始系統關係應被保留。</p>
      <p>若內容對你有所啟發而需要引用、改作、延伸或公開使用，請保留 <strong>Lucas Oscar Wang 政德／lo3rwang</strong> 的作者紀錄與來源脈絡；超出既有授權條件的使用，請先取得作者本人同意。</p>
      <p>Copyleft 的目的不是限制參考，而是避免來源被抹除。可以延伸，可以不同意，也可以建立自己的版本；但不應把源自 LOC／LunaRunes 的核心資料、結構或語意設計改寫成無來源的自有創作。</p>
      <p>商業顧問、系統架構、治理設計、解析介面與個案實作，則屬於另外的服務與合作範圍。</p>
      <p><a href="https://github.com/EsotericVerse/moon-runes-pwa">Copyleft 文件入口（COPYLEFT.md）</a></p>
    </section>

    <section className="loc-card" id="documents">
      <p className="loc-eyebrow">Documents</p>
      <h2>文件</h2>
      <p><a href="https://github.com/EsotericVerse/moon-runes-pwa">Repository 文件入口</a>：COPYLEFT.md、README.md 與其他治理文件由 Repository 統一管理。</p>
      <p><a href="/docs/LOC_Canon.docx">LOC Canon</a>：LOC 現行架構、定義與治理基準。</p>
    </section>
  </div>;
}

function GovernanceHome(){
  return <FeaturePageV2
    featureId="governance"
    subtitle="基本理念與法律。"
  >
    <PrinciplesPanel/>
    <LawPanel/>
  </FeaturePageV2>;
}

export default function GovernanceV2({section=null}){
  if(section==='faq')return <FaqView/>;
  if(section==='law')return <FeaturePageV2 featureId="governance" subtitle="法律"><LawPanel/></FeaturePageV2>;
  return <GovernanceHome/>;
}
