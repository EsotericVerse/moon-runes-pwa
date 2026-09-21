import { PageComposition } from '../../PageComposition';

const ROOT=['鑑古知今，求同存異','不在其位，不謀其政','隨心所欲，而不逾己'];

const SECTION_COPY={
  style:['主要身份','lo3rwang 是王政德（Lucas Oscar Wang）的公開識別名稱。主要身份為 LOC／月典創作者與系統設計者、Language Governance Architect、Wordsmith、Calibrator／時空校對者，以及文字、音樂與多媒體創作者。EsotericVerse Studio／秘藝文域則承接相關創作與系統實作。'],
  work:['工作與合作','對外合作以 Language Consultant 為主要定位，可依個案以顧問、專案或系統實作方式合作，處理命名與正名、語意治理、資料分類、知識架構、RAG、搜尋與解析、版本治理、文本關係、長期演化、語意污染與資料責任問題。目標不是把每個個案套進 LOC，而是先理解對方原本的語言與資料，再建立適合自己的結構。'],
  design:['LOC設計理念','LOC／月典是一套可進化、可重複使用的模型化語言框架（Modelized Language Framework）；LunaRunes／月之符文是一套符號式語言（Symbolic Language）。LOC 不取代自然語言，而是整理語彙、脈絡、創作、規則、模組與時間軌跡，使其可分析、可治理、可搜尋與持續維護。'],
  galaxy:['公開創作內容','公開內容包含 LOC 與月之符文、歌曲與歌詞、小說與文字作品、Reels、多媒體、政德風與語言治理分析。Facebook、Threads、Instagram、Suno 等平台是作品、生活文字、音樂與系統發展紀錄的來源；平台本身不是身份。'],
  others:['其他說明','過去可以保留，錯誤可以標記，理解可以更新。歷史無法被重寫，但可以重新定位。公開方法不等於無償勞務；顧問判斷、架構設計、資料整理、系統實作、個案研究與持續治理都具有專業價值。'],
  email:['聯絡方式','合作、顧問、系統設計、數位遺產管理或其他公開內容相關事項，請透過電子郵件聯絡。']
};

export default function AuthorHomeView({section=null}){
  const sections=[
    {
      id:'governance-root',
      eyebrow:'Governance Root',
      title:'目前的人生觀',
      content:<>
        {ROOT.map(line=><p className="loc-core-line" key={line}>{line}</p>)}
        <p>這 24 個字是我的 Governance Root，也是自我治理的根本；它用來約束我自己，不要求別人接受相同分類或價值判斷。</p>
        <p><strong>補充自述：</strong>「凡利於我者，皆利於我。」這句保留為個人觀點補充，不併入固定的 24 字 Governance Root。</p>
      </>,
      links:[{label:'查看作者治理',href:'/governance'}]
    },
    {
      id:'roles',
      eyebrow:'Roles',
      title:'三位一體',
      content:<div className="loc-grid three">
        <article><strong>文字工匠 · Wordsmith</strong><p>從詞、句子與關鍵詞的聯繫，整理文字怎麼形成自己的語意與脈絡關係。</p><p><a href="/context">看脈絡</a></p></article>
        <article><strong>校對者 · Calibrator</strong><p>把文字放回來源、時間與歷史裡比較，觀察文化軌跡、延續、改變、矛盾與可能的污染。</p><p><a href="/culture">看文化</a></p></article>
        <article><strong>語言治理架構者 · Language Governance Architect</strong><p>把語彙、脈絡、文化、搜尋與治理組織成可持續使用的個人語言與系統結構。</p><p><a href="/governance">看治理</a></p></article>
        </div>
    },
    {
      id:'profile-content',
      eyebrow:'Official Public Profile',
      title:'我主要在做什麼？',
      content:<>
        <p><strong>lo3rwang</strong> 是王政德（Lucas Oscar Wang）的公開識別名稱。主要身份為 LOC／月典創作者與系統設計者、Language Governance Architect、Wordsmith、Calibrator／時空校對者。對外合作定位為 <strong>Language Consultant</strong>。</p>
        <p>我主要處理<strong>語言、資料、脈絡與時間</strong>之間的關係：把分散的文字、作品、規則、版本與歷史紀錄，整理成可搜尋、可理解、可治理、可持續維護的結構。</p>
        <p>目前工作方向聚焦於語言治理、語言系統設計、知識與資料架構、數位遺產管理，以及相關顧問與專案實作。</p>
        <p>Facebook、Threads、Instagram、Suno 等平台主要是作品、生活文字、音樂與系統發展紀錄的來源；內容再依 LOC 的模組與資料責任進行整理、搜尋、分析與治理，而不是把平台本身當成身份。</p>
      </>
    },
    {
      id:'work',
      eyebrow:'Language Consultant · Project Work',
      title:'語言顧問、語言治理與系統設計',
      content:<>
        <p>對外合作職能以 <strong>Language Consultant</strong> 為主要定位，可依個案以顧問、專案或系統實作方式合作，處理命名與正名、語意治理、資料分類、知識架構、RAG、搜尋與解析、版本治理、文本關係、長期演化，以及既有系統中的語意污染與資料責任問題。</p>
        <p>目標不是把每個個案套進 LOC，而是理解對方原本的語言與資料，再依實際需求建立適合自己的結構。</p>
      </>
    },
    {
      id:'digital-legacy',
      eyebrow:'Digital Legacy · Governance',
      title:'數位遺產管理',
      content:<>
        <p>另一個長期發展方向是數位遺產管理：協助個人、創作者或組織整理長期累積的文字、照片、影音、作品、帳號資料、版本與歷史紀錄，使其從散落檔案轉成可搜尋、可理解、可追溯來源並能長期維護的數位資產。</p>
        <p>這不只是備份，而包含沿革整理、時間校準、身份與名稱治理、資料關聯、權限與來源紀錄，以及未來如何被繼承、研究或再次使用。</p>
      </>
    },
    {
      id:'open-source',
      eyebrow:'Open Source · Professional Work',
      title:'開放方法，專業工作有其價值',
      content:<>
        <p>我支持開放、Copyleft 與可追溯來源的創作方式，也鼓勵每個人發展自己的符號、自己的語言系統與自己的風格。</p>
        <p><strong>開放核心不等於無償勞務。</strong>顧問判斷、架構設計、資料整理、系統實作、個案研究與持續治理都需要投入專業時間。公開的是可被理解與延伸的方法；商業價值則來自如何針對真實問題完成分析、設計與實作。</p>
      </>
    },
    {
      id:'philosophy',
      eyebrow:'Philosophy · Self Description',
      title:'思想取向',
      content:<>
        <p>作者本人自我描述，思想上偏向道教老子體系。此處所說的「道德」，主要取道家語境中的道與德、天地人，而非儒家「天地君親師」的倫理秩序。</p>
        <p>在實踐態度上，則偏向 Druid 所象徵的自然觀與無為：觀察自然、順勢而行，不以強制控制取代理解。這也是我後來處理語言、治理、創作與人生經驗時的重要底色之一。</p>
      </>
    },
    {
      id:'name-origin',
      eyebrow:'Name · Origin',
      title:'Lucas Oscar Wang 政德',
      content:<>
        <p><strong>Lucas</strong> 取其「光芒」的意象；常用的 <strong>Oscar</strong> 則來自凱爾特文化，取「神聖長矛」之意，象徵勇氣。</p>
        <p>兩者組合成英文名 <strong>Lucas Oscar Wang</strong>，象徵光芒的勇氣，與現行中文名<strong>政德</strong>共同構成目前使用的作者姓名。<strong>lo3rwang</strong> 則作為公開識別。</p>
        <p>另有別名 <strong>dlwang／Lucipher Drucula Wang</strong>，作為自己的陰暗面名稱。它用來承認人在情緒低落或人生失常時也可能呈現不同的一面；不否定那些過去的自己，而是學著面對、接受並繼續前進。</p>
      </>
    },
    {
      id:'calibration',
      eyebrow:'Calibration · Time',
      title:'時空定錨論',
      content:<>
        <p>時間是一條不可逆的時間長河。年份是定位與比較的參考指標，並不代表經驗會自動依整齊規則排列。</p>
        <p>對我而言，「定錨」不是時空穿梭，而是在某個時間點留下可辨識的文字與資料位置，再從來源、脈絡與後續變化觀察不同時期的自己。已經發生的歷史不能倒回，但可以重新理解、重新定位。</p>
        <p>文字紀錄因此成為校對工具：觀看過去在哪些時期發生了什麼變化，可能變好，也可能變差；重點不是否認過去，而是讓現在對未來作出新的選擇。</p>
      </>
    },
    {
      id:'loc',
      eyebrow:'LOC · LunaRunes',
      title:'LOC／月典',
      content:<>
        <p><strong>LOC</strong> 是一套可進化、可重複使用的<strong>模型化語言框架（Modelized Language Framework）</strong>。</p>
        <p><strong>LunaRunes／月之符文</strong>是一套有自己獨特方式的<strong>符號式語言（Symbolic Language）</strong>。</p>
        <p>LOC 的目的不是取代自然語言，而是把語言中的語彙、脈絡、創作、規則、模組與時間軌跡整理成可分析、可治理、可搜尋、可持續維護的文化軌跡；月之符文則是其中以符號化語彙實作的 Symbolic Language。</p>
      </>,
      links:[{label:'查看 LOC／月典',href:'https://loc.lo3rwang.cc/'}]
    },
    {
      id:'corpus',
      eyebrow:'Corpus',
      title:'目前資料規模',
      content:<ul>
        <li><strong>Facebook Corpus：</strong>2011-04-15 ～ 2026-09-03，累積 22,493 筆歷史紀錄，其中 17,656 筆具可搜尋文字。</li>
        <li><strong>Threads Corpus：</strong>2024-11-18 ～ 2026-09-06，累積 4,578 筆主貼文、2,430 筆 Reply，共 7,008 筆可分析公開文字紀錄。</li>
        <li><strong>Suno Corpus：</strong>歌曲與歌詞持續納入整理，保留作品日期、時期、主題與跨作品關聯資料；流動統計不作固定規則。</li>
        <li><strong>創作作品：</strong>核心小說與文章全文 corpus 已接入搜尋；《月語者》共 7 篇、182 章，作品級與章級 baseline 解析均已完成。</li>
      </ul>
    },
    {
      id:'reels',
      eyebrow:'Author Reel',
      title:'這就是我',
      content:<div className="loc-context-list"><article className="loc-context-item"><strong>不認識我？沒關係！先聽首歌吧！</strong><p>這支作品是王政德／lo3rwang 的個人自我介紹，不是月之符文宣傳內容。</p><p><a href="https://www.instagram.com/p/DdX5ki-oZY6/" target="_blank" rel="noopener noreferrer">在 Instagram 查看〈這就是我〉 →</a></p></article></div>
    },
    {
      id:'micro-moonlight',
      eyebrow:'Song',
      title:'只是微月光',
      content:<div className="loc-context-list"><article className="loc-context-item"><p>「我只是微月光，若我的存在光芒能讓你在全黑夜中找到希望，我會感到榮幸，但這並不是我生來就注定成為希望。」</p><p><a href="https://suno.com/song/a0a724c1-d35f-4ccf-9ac1-0c1c9f2d6a50" target="_blank" rel="noopener noreferrer">聽〈只是微月光〉 →</a></p><p><a href="https://www.instagram.com/p/DdiDIzDIYS3/" target="_blank" rel="noopener noreferrer">看〈只是微月光〉 Reels →</a></p></article></div>
    },
    {
      id:'official-links',
      eyebrow:'Official Links',
      title:'官方連結',
      content:<div className="loc-context-list">
        <article className="loc-context-item"><p><a href="https://lo3rwang.cc/" target="_blank" rel="noopener noreferrer">個人網站</a></p></article>
        <article className="loc-context-item"><p><a href="https://github.com/lo3rwang" target="_blank" rel="noopener noreferrer">GitHub 個人</a></p></article>
        <article className="loc-context-item"><p><a href="https://github.com/EsotericVerse/moon-runes-pwa" target="_blank" rel="noopener noreferrer">LOC 專案 GitHub</a></p></article>
        <article className="loc-context-item"><p><a href="https://www.linkedin.com/in/lo3rwang/" target="_blank" rel="noopener noreferrer">LinkedIn</a></p></article>
        <article className="loc-context-item"><p><a href="https://www.instagram.com/lo3rwang/" target="_blank" rel="noopener noreferrer">Instagram</a></p></article>
        <article className="loc-context-item"><p><a href="https://www.threads.com/@lo3rwang" target="_blank" rel="noopener noreferrer">Threads</a></p></article>
      </div>
    }
  ];

  const sectionCopy=SECTION_COPY[section];
  return <PageComposition
    eyebrow="Author"
    title="王政德"
    subtitle="Lucas Oscar Wang · lo3rwang"
    intro={<><div className="loc-author-reel"><iframe src="https://www.instagram.com/p/DdX5ki-oZY6/embed" title="這就是我｜王政德自我介紹" loading="eager" allowTransparency="true" frameBorder="0" scrolling="no"/></div><p>不認識我？沒關係！先聽首歌吧。</p><p><a href="https://www.instagram.com/p/DdX5ki-oZY6/" target="_blank" rel="noopener noreferrer">在 Instagram 開啟〈這就是我〉 →</a></p><p><a href="https://suno.com/s/AdpORl6l79UYLcor" target="_blank" rel="noopener noreferrer">聽〈這就是我〉 →</a></p></>}
    localMenu={[['簡介跟自述','/lo3rwang'],['主要身份','/lo3rwang/style'],['工作與合作','/lo3rwang/work'],['LOC設計理念','/lo3rwang/design'],['公開創作內容','/lo3rwang/galaxy'],['其他說明','/lo3rwang/others'],['聯絡方式','/lo3rwang/email']].map(([label,href])=>({label,href}))}
    sections={sectionCopy?[{id:`author-${section}`,eyebrow:section,title:sectionCopy[0],content:<p>{sectionCopy[1]}{section==='email'?<> <a href="mailto:sopa2306@gmail.com">聯絡方式 mailto:sopa2306@gmail.com</a></>:null}</p>}]:sections}
  />;
}
