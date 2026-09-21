import { PageComposition } from '../../PageComposition';

const ROOT=['鑑古知今，求同存異','不在其位，不謀其政','隨心所欲，而不逾己'];

const SECTION_COPY={
  style:['主要身份','LOC／月典創作者與系統設計者、Language Governance Architect、Wordsmith、Calibrator／時空校對者。'],
  work:['工作與合作','對外合作定位為 Language Consultant，工作方向聚焦於語言治理、語言系統設計、知識與資料架構、數位遺產管理，以及相關顧問與專案實作。'],
  design:['LOC設計理念','把分散的文字、作品、規則、版本與歷史紀錄，整理成可搜尋、可理解、可治理、可持續維護的結構。'],
  galaxy:['公開創作內容','公開內容包含 LOC 與月之符文、歌曲與歌詞、小說與文字作品、Reels、多媒體、政德風與語言治理分析。'],
  others:['其他說明','lo3rwang 是王政德（Lucas Oscar Wang）的公開識別名稱；過去可以保留，錯誤可以標記，理解可以更新。'],
  email:['聯絡方式','合作、顧問、系統設計或其他公開內容相關事項，請透過電子郵件聯絡。']
};

export default function AuthorHomeView({section=null}){
  const sections=[
    {
      id:'governance-root',
      eyebrow:'Governance Root',
      title:'我的 24 個字',
      content:<>{ROOT.map(line=><p className="loc-core-line" key={line}>{line}</p>)}<p>這是我的人生觀與自我治理方式，不要求別人接受相同分類或價值判斷。</p></>,
      links:[{label:'查看作者治理',href:'/governance'}]
    },
    {
      id:'roles',
      eyebrow:'Roles',
      title:'三個自我稱號',
      content:<div className="loc-grid three">
        <article><strong>文字工匠 · Wordsmith</strong><p>從詞、句子與關鍵詞的聯繫，整理文字怎麼形成自己的語意與風格。</p><p><a href="/context">看脈絡</a></p></article>
        <article><strong>校對者 · Calibrator</strong><p>把文字放回來源、時間與歷史裡比較，觀察延續、改變、消失、矛盾與可能的污染。</p><p><a href="/culture">看文化</a></p></article>
        <article><strong>語言治理架構者 · Language Governance Architect</strong><p>把語彙、脈絡、文化、搜尋與治理組織成可持續使用的語言系統。</p><p><a href="/governance">看治理</a></p></article>
        </div>
    },
    {
      id:'reels',
      eyebrow:'Reels',
      title:'公開 Reels',
      content:<div className="loc-context-list"><article className="loc-context-item"><strong>月之符文公開占卜示範</strong><p><a href="https://www.instagram.com/reel/DMA9yDAzeRK/" target="_blank" rel="noopener noreferrer">在 Instagram 查看第一支 Reels →</a></p></article><article className="loc-context-item"><strong>月之符文使用示範</strong><p><a href="https://www.instagram.com/reel/DMA-ZxLTINw/" target="_blank" rel="noopener noreferrer">在 Instagram 查看第二支 Reels →</a></p></article></div>
    }
  ];
  const sectionCopy=SECTION_COPY[section];
  return <PageComposition
    eyebrow="Author"
    title="王政德"
    subtitle="Lucas Oscar Wang · lo3rwang"
    intro={<><p>對我很陌生？沒關係，可以先聽首歌，再決定要不要繼續認識我。</p><p><a href="https://suno.com/s/AdpORl6l79UYLcor" target="_blank" rel="noopener noreferrer">聽首歌</a></p></>}
    localMenu={[['簡介跟自述','/lo3rwang'],['主要身份','/lo3rwang/style'],['工作與合作','/lo3rwang/work'],['LOC設計理念','/lo3rwang/design'],['公開創作內容','/lo3rwang/galaxy'],['其他說明','/lo3rwang/others'],['聯絡方式','/lo3rwang/email']].map(([label,href])=>({label,href}))}
    sections={sectionCopy?[{id:`author-${section}`,eyebrow:section,title:sectionCopy[0],content:<p>{sectionCopy[1]}{section==='email'?<> <a href="mailto:sopa2306@gmail.com">聯絡方式 mailto:sopa2306@gmail.com</a></>:null}</p>}]:sections}
  />;
}
