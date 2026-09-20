import { PageComposition } from '../../PageComposition';

const ROOT=['鑑古知今，求同存異','不在其位，不謀其政','隨心所欲，而不逾己'];

export default function AuthorHomeView(){
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
    }
  ];
  return <PageComposition
    eyebrow="Author"
    title="王政德"
    subtitle="Lucas Oscar Wang · lo3rwang"
    intro={<><p>對我很陌生？沒關係，可以先聽首歌，再決定要不要繼續認識我。</p><p><a href="https://suno.com/s/AdpORl6l79UYLcor" target="_blank" rel="noopener noreferrer">聽首歌</a></p></>}
    localMenu={[['簡介跟自述','/lo3rwang'],['主要身份','/lo3rwang/style'],['工作與合作','/lo3rwang/work'],['LOC設計理念','/lo3rwang/design'],['公開創作內容','/lo3rwang/galaxy'],['其他說明','/lo3rwang/others'],['聯絡方式','/lo3rwang/email']].map(([label,href])=>({label,href}))}
    sections={sections}
  />;
}
