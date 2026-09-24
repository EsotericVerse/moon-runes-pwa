'use client';

import {useQuery} from '@tanstack/react-query';
import {fetchNeonData} from '../../loc/data';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeFeatureSubtitleV2} from '../page-profiles.v2';
import FeaturePageV2 from '../FeaturePageV2';

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
  const query=useQuery({
    queryKey:['governance-faq'],
    queryFn:()=>fetchNeonData('knowledge/faq',{memory:true}),
    staleTime:5*60_000
  });
  const rows=Array.isArray(query.data)?query.data:[];

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">FAQ</p>
      <h1>常見問題</h1>
      <p className="loc-subtitle">FAQ 直接讀取 Neon 正式資料。</p>
    </header>
    {query.isPending?<p className="scope-v2-status">載入 FAQ…</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{query.error.message}</p>:null}
    {!query.isPending&&!query.error&&!rows.length?<p>目前沒有 FAQ 資料。</p>:null}
    <div className="loc-grid two">
      {rows.map((row,index)=><article className="loc-card" key={row?.faq_id||row?.id||row?.faq_key||index}>
        <p className="loc-eyebrow">{faqCategory(row)}</p>
        <h2>{faqQuestion(row,index)}</h2>
        <p>{faqAnswer(row)}</p>
      </article>)}
    </div>
  </section>;
}

function CopyrightView(){
  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Copyright · Open Source</p>
      <h1>版權說明</h1>
      <p className="loc-subtitle">公開來源、公開依賴、保留各自授權條件。</p>
    </header>
    <section className="loc-card">
      <p>LOC 與 LunaRunes 的公開內容依專案既有授權與 Copyleft 原則提供；第三方套件仍依各自授權條款使用。</p>
      <p>本站以 Next.js／React 為主要應用架構；Graph 與 Time River 負責關係與時間顯示；Casbin 負責授權與存取控制；FlexSearch 負責全文與關鍵詞搜尋；Neon 為正式資料來源。</p>
      <p>採用第三方套件不代表第三方替本站全部安全性背書；各套件只負責其明確功能範圍。</p>
    </section>
  </section>;
}

export default function GovernanceV2({section=null}){
  const {scopeId}=useScopeRuntimeV2();
  if(section==='faq')return <FaqView/>;
  if(section==='law')return <CopyrightView/>;

  return <FeaturePageV2
    featureId="governance"
    description={<><p>說明 LOC 的治理原則、Scope 邊界、權限與資料責任。</p><p>所有內容供參考與延伸；是否使用、如何理解與採取行動，由使用者自行決定。</p></>}
  >
    <section className="loc-card" id="governance-principles">
      <p className="loc-eyebrow">Principles</p>
      <h2>基本原則</h2>
      <p className="loc-core-line">尊重 · 和平 · 包容 · 友善</p>
      <p><strong>LOC 保持客觀與中立。</strong>不預設宗教、政治、道德或人生價值立場，也不要求任何人接受作者的信仰、觀念或生活方式。</p>
      <p>任何人都可以選擇使用、引用、改寫、比較或不用。系統提供整理與分析，不替使用者裁決。</p>
      <p>歷史保留，解釋可校準；Spec 優先，先判斷詞彙本身的詞性，再判斷群組主體性。</p>
    </section>
    <div className="loc-grid two">
      <section className="loc-card">
        <p className="loc-eyebrow">Scope</p><h2>Scope 分治</h2>
        <p>每個 Scope 擁有自己的資料、脈絡、文化、統計與搜尋。跨 Scope 可以引用與連結，但不因此取得對方治理權。</p>
        <p>LOC 本身只作為聚合入口：脈絡連到 lo3rwang 與 LunaRunes；文化與統計也讀取兩個 Scope 的現行狀態，不另建立第三套時期。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Authorization</p><h2>權限</h2>
        <p>Casbin 負責授權與存取控制。Graph、搜尋與其他功能只能顯示已被允許讀取的節點、關係與資料。</p>
        <p>User 與 Privileges 等不同權限視圖各有自己的 Graph 原點，不混成同一張圖。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Data</p><h2>資料原則</h2>
        <p>Neon 是正式資料來源。頁面不以 JSON 作為 Current 正式資料來源，也不建立另一套平行資料權威。</p>
        <p>作品可由章節組成篇，再由篇組成書；時期統計依實際章節／文字日期切片，作品集合本身仍保持完整。</p>
      </section>

      {scopeId==='lo3rwang'?<section className="loc-card">
        <p className="loc-eyebrow">Personal Governance</p><h2>個人治理根本</h2>
        <p className="loc-core-line">鑑古知今，求同存異<br/>不在其位，不謀其政<br/>隨心所欲，而不逾己</p>
      </section>:null}
    </div>
  </FeaturePageV2>;
}
