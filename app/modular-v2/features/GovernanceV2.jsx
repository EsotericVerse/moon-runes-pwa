'use client';

import {useQuery} from '@tanstack/react-query';
import {fetchNeonData} from '../../loc/data';
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
  if(section==='faq')return <FaqView/>;
  if(section==='law')return <CopyrightView/>;

  return <FeaturePageV2
    featureId="governance"
    subtitle="原則、版權、治理態度與延伸治理文件。"
    description={<p>治理處理 LOC 與月之符文如何被使用、引用、延伸與修正。LOC 有自己的框架、特性與調性，但不要求任何人接受或使用；所有內容均可作為分析、參考與延伸思考的材料。</p>}
  >
    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <p className="loc-eyebrow">Principles</p>
        <h2>原則</h2>
        <p className="loc-core-line">尊重 · 和平 · 包容 · 友善</p>
        <p><strong>LOC 本身保持客觀與中立。</strong>它不預設宗教、政治、道德或人生價值立場，也不要求使用者接受作者本人的信仰、觀念或生活方式。</p>
        <p>LOC 有自己的語言框架、分析方式、資料治理方法與表達調性；這些屬於系統特性，不等於要求他人認同。任何人都可以選擇使用、部分使用、引用、改寫、比較，或完全不用。</p>
        <p>月之符文保留符文、抽籤與籤詩的文化與創作形式，但分析只是參考，不是命令，也不是唯一答案。系統不得以多數意見、社會期待、宗教權威、道德壓力或情緒施壓取代使用者自己的判斷。</p>
        <p><strong>歷史保留，解釋可校準。</strong>LOC 不以新版本抹除舊版本，也不因歷史存在就把舊定義視為永久真理。事件、來源與版本應保留；定義、方法與解釋可依證據、脈絡與需求重新檢視。</p>
        <p><strong>Spec 優先。</strong>高歧義或容易被一般字面直覺帶偏的符文，必須先以 Spec 明確界定它描述的主體，再進入關鍵詞、方向與延伸描述。Spec 是語意邊界，不是事後補充。</p>
        <p><strong>先判斷詞彙本身的詞性，再判斷群組的主體性。</strong>RAG 的基礎分類先辨認詞彙在文本中的實際詞性，例如名詞、動詞、形容詞或副詞；再依 LunaRunes 群組所代表的語意場域與主體性，判斷應歸屬的符文。不得只憑字面關鍵詞直接映射。</p>
        <p><strong>優先使用不需 API key 的可解釋分類。</strong>能以固定資料、詞性、群組主體性、關鍵詞與規則完成的基礎分類，先在本地完成，再進行統計、索引與關聯；只有規則不足以有效區分時，才進入更高階的語意分析。</p>
        <p><strong>文字顯示也屬於治理。</strong>顯示順序必須服從語意權威：Spec 先於關鍵詞、方向與延伸說明；同一層級的內容應使用一致的呈現層級。不得因排版、字級、色彩或位置，讓低層級文字看起來比其上位定義更具權威。</p>
        <p><strong>先治理，再實作。</strong>語意定義、分類規則與文字呈現原則先確定，再套用到資料、RAG、介面與功能頁；避免因實作先行而讓舊定義、暫時文字或不同頁面的例外回寫成新的語意污染。</p>
      </section>

      <section className="loc-card" id="copyright">
        <p className="loc-eyebrow">Copyright · Copyleft</p>
        <h2>版權</h2>
        <p>LOC 與 LunaRunes 採 <strong>Copyleft</strong> 思路公開核心內容。歡迎閱讀、研究、參考與依既有授權條件延伸，但來源、作者姓名與原始系統關係應被保留。</p>
        <p>若內容對你有所啟發而需要引用、改作、延伸或公開使用，請保留 <strong>Lucas Oscar Wang 政德／lo3rwang</strong> 的作者紀錄與來源脈絡；超出既有授權條件的使用，請先取得作者本人同意。</p>
        <p>Copyleft 的目的不是限制參考，而是避免來源被抹除。可以延伸，可以不同意，也可以建立自己的版本；但不應把源自 LOC／LunaRunes 的核心資料、結構或語意設計改寫成無來源的自有創作。</p>
        <p>商業顧問、系統架構、治理設計、解析介面與個案實作，則屬於另外的服務與合作範圍。</p>
        <p><a href="https://github.com/EsotericVerse/moon-runes-pwa">Copyleft 文件入口（COPYLEFT.md）</a>：COPYLEFT.md（Markdown）保留於 Repository，由 Repository 文件入口查看。</p>
      </section>

      <section className="loc-card" id="philosophy">
        <p className="loc-eyebrow">Tone · Governance</p>
        <h2>治理態度</h2>
        <p><strong>尊重、和平、包容、友善。</strong></p>
        <p>這四個詞描述 LOC 對外互動的基本態度，而不是一套要求他人遵守的人生教條。LOC 的框架可以有明確邊界，分析可以有清楚規則，但不以強迫採用、排斥異見或建立唯一正統為目標。</p>
        <p>LOC 提供的是一套可參考、可檢查、可延伸的語言系統方法。使用者保有自己的主權與判斷；系統則保有自己的資料規格、方法邊界與版本紀錄。</p>
        <p>可以參考，不必服從；可以延伸，不必成為同一套思想；只希望在使用與引用時尊重來源，遵守 Copyleft 與作者署名原則。</p>
      </section>

      <section className="loc-card" id="documents">
        <p className="loc-eyebrow">Documents</p>
        <h2>文件</h2>
        <p>治理首頁只放基本原則。較完整的法律、資料、版本、語意、Repository 與系統治理內容，整理成延伸文件，不在這一頁全部攤開。</p>
        <p><a href="https://github.com/EsotericVerse/moon-runes-pwa">Repository 文件入口</a>：COPYLEFT.md（Markdown）、README.md（Markdown）與其他治理文件由 Repository 統一管理。</p>
        <p><a href="/docs/LOC_Canon.docx">LOC Canon</a>：LOC 現行架構、定義與治理基準。</p>
      </section>
    </div>
  </FeaturePageV2>;
}
