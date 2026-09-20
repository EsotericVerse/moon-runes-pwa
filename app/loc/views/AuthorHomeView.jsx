import { PageComposition } from '../../PageComposition';

const ROOT=['鑑古知今，求同存異','不在其位，不謀其政','隨心所欲，而不逾己'];

const SECTION_COPY={
  style:['主要身份','lo3rwang 是王政德（Lucas Oscar Wang）的公開識別名稱。主要身份為 LOC／月典創作者與系統設計者、Language Governance Architect、Wordsmith、Calibrator／時空校對者。'],
  work:['工作與合作','主要工作不是單純的內容創作，而是處理語言、資料、脈絡與時間之間的關係；對外合作定位為 Language Consultant，工作方向包含語言治理、語言系統設計、知識與資料架構、數位遺產管理，以及顧問與專案實作。'],
  design:['LOC設計理念','把分散的文字、作品、規則、版本與歷史紀錄，整理成可搜尋、可理解、可治理、可持續維護的結構。LOC／月典是可重複使用的模組化語言框架；月之符文是其中一套符號式語言實作。'],
  galaxy:['公開創作內容','公開內容包含 LOC 與月之符文、歌曲與歌詞、小說與文字作品、Reels、多媒體、政德風與語言治理分析。Facebook、Threads、Instagram、Suno 等平台是作品與系統發展紀錄的來源。'],
  others:['其他說明','過去可以保留，錯誤可以標記，理解可以更新。公開內容會依來源、時間、脈絡與資料責任整理，不把平台本身當成身份。'],
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
      id:'profile-content',
      eyebrow:'Official Public Profile',
      title:'我主要在做什麼？',
      content:<>
        <p>我主要處理語言、資料、脈絡與時間之間的關係，把分散的文字、作品、規則、版本與歷史紀錄，整理成可搜尋、可理解、可治理、可持續維護的結構。</p>
        <p>LOC／月典是我自行發展的模組化語言框架；LunaRunes／月之符文是其中一套符號式語言實作。公開核心是為了讓方法可以被理解、研究與延伸，不代表專業服務、個案分析、系統設計與實作必須無償提供。</p>
        <p>三個現行公開職稱：<strong>Language Governance Architect</strong>、<strong>Wordsmith</strong>、<strong>Calibrator／時空校對者</strong>。</p>
      </>
    },
    {
      id:'reels',
      eyebrow:'Author Reel',
      title:'這就是我',
      content:<div className="loc-context-list"><article className="loc-context-item"><strong>作者自我介紹作品</strong><p>這支作品是王政德／lo3rwang 的個人自我介紹，不是月之符文宣傳內容。</p><p><a href="https://www.instagram.com/p/DdX5ki-oZY6/" target="_blank" rel="noopener noreferrer">在 Instagram 查看〈這就是我〉 →</a></p></article></div>
    }
  ];
  const sectionCopy=SECTION_COPY[section];
  return <PageComposition
    eyebrow="Author"
    title="王政德"
    subtitle="Lucas Oscar Wang · lo3rwang"
    intro={<><div className="loc-author-reel"><iframe src="https://www.instagram.com/p/DdX5ki-oZY6/embed" title="這就是我｜王政德自我介紹" loading="eager" allowTransparency="true" frameBorder="0" scrolling="no"/></div><p>對我很陌生？沒關係，可以先看這支自我介紹，再決定要不要繼續認識我。</p><p><a href="https://www.instagram.com/p/DdX5ki-oZY6/" target="_blank" rel="noopener noreferrer">在 Instagram 開啟〈這就是我〉 →</a></p><p><a href="https://suno.com/s/AdpORl6l79UYLcor" target="_blank" rel="noopener noreferrer">聽首歌</a></p></>}
    localMenu={[['簡介跟自述','/lo3rwang'],['主要身份','/lo3rwang/style'],['工作與合作','/lo3rwang/work'],['LOC設計理念','/lo3rwang/design'],['公開創作內容','/lo3rwang/galaxy'],['其他說明','/lo3rwang/others'],['聯絡方式','/lo3rwang/email']].map(([label,href])=>({label,href}))}
    sections={sectionCopy?[{id:`author-${section}`,eyebrow:section,title:sectionCopy[0],content:<p>{sectionCopy[1]}{section==='email'?<> <a href="mailto:sopa2306@gmail.com">聯絡方式 mailto:sopa2306@gmail.com</a></>:null}</p>}]:sections}
  />;
}
