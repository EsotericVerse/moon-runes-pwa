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
  </FeaturePageV2>;
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
    description={<><p>治理處理如何被使用、引用、延伸與修正。的原則。</p><p>不要求任何人接受或使用；所有內容均可作為分析、參考與延伸思考的材料。</p></>}
  >
    <div className="loc-grid two">
      <section className="loc-card">
        <p className="loc-eyebrow">Scope</p><h2>Scope 分治</h2>
        <p>每個 Scope 擁有自己的資料、脈絡、文化、統計與搜尋。跨 Scope 可以引用與連結，但不因此取得對方治理權。</p>
        <p>LOC 本身只作為聚合入口：脈絡連到 lo3rwang 與 LunaRunes；文化與統計也讀取兩個 Scope 的現行狀態，不另建立第三套時期。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Graph</p><h2>關係圖</h2>
        <p>Graph 用來顯示各種已建立的關係。固定原點、一次只看必要的一層，不遞迴載入整棵關係樹。</p>
        <p>搜尋命中後只補 Graph 的上下一層定位；跨 Scope 節點則直接進入對方 Scope 的脈絡。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Time River</p><h2>時間長河</h2>
        <p>時間長河只用於文化與統計。以 Current 為起點，需要時才往前查看歷史時期，再由前一期返回後一期。</p>
        <p>沒有留下文字的時間不推定文字風格；本人可以另外補上回憶註解，但註解與當時原始文字分開保存。</p>
      </section>

      <section className="loc-card">
        <p className="loc-eyebrow">Keywords</p><h2>關鍵詞與分類</h2>
        <p>簡單語言分析以明確關鍵詞對應、群組分類與可觀察數字為基礎，不以模糊語意自動替文字下定義。</p>
        <p>LunaRunes 是預設群組分類方式，不是強制標準；使用者可以設定自己的群組與關鍵詞。</p>
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
  </section>;
}
