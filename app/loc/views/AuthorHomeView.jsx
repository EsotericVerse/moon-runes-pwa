import { PageComposition } from '../../PageComposition';

const ROOT=['鑑古知今，求同存異','不在其位，不謀其政','隨心所欲，而不逾己'];

const AUTHOR_FUNCTIONS=Object.freeze([
  Object.freeze({eyebrow:'Context',title:'脈絡',text:'把文字、作品、事件與來源放回關係中，從關鍵詞與事件看彼此如何連結。',href:'/context',label:'查看脈絡'}),
  Object.freeze({eyebrow:'Statistics',title:'統計',text:'依年份、來源與時期整理筆數、關鍵詞與分布，先看整體，再回到作品。',href:'/statics',label:'查看統計'}),
  Object.freeze({eyebrow:'Culture',title:'文化',text:'把作品放回個人時期與時間長河，觀看文字風格、作品與生命經驗如何變化。',href:'/culture',label:'查看文化'}),
  Object.freeze({eyebrow:'Governance',title:'治理',text:'管理名稱、作品、時期、公開範圍與資料來源；作者的定義不會被系統自動升格為 LOC Canon。',href:'/governance',label:'查看治理'}),
  Object.freeze({eyebrow:'Search',title:'搜尋',text:'從關鍵詞、作品、來源或日期開始，找到時間點，再查看附近的脈絡與作品。',href:'/search',label:'開始搜尋'})
]);

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
        <p>我的工作重心不是單純的內容創作，而是處理<strong>語言、資料、脈絡與時間</strong>之間的關係：把分散的文字、作品、規則、版本與歷史紀錄，整理成可搜尋、可理解、可治理、可持續維護的結構。</p>
        <p>目前工作方向聚焦於語言治理、語言系統設計、知識與資料架構、數位遺產管理，以及相關顧問與專案實作。</p>
        <p>Facebook、Threads、Instagram、Suno 等平台主要是作品、生活文字、音樂與系統發展紀錄的來源；內容再依 LOC 的模組與資料責任進行整理、搜尋、分析與治理，而不是把平台本身當成身份。</p>
      </>
    },
    {
      id:'functions',
      eyebrow:'Personal Scope · Functions',
      title:'我的資料怎麼被整理',
      content:<div className="loc-grid two">{AUTHOR_FUNCTIONS.map(item=><article key={item.title}><p className="loc-eyebrow">{item.eyebrow}</p><h3>{item.title}</h3><p>{item.text}</p><p><a href={item.href}>{item.label} →</a></p></article>)}</div>
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
        <p><strong>Luna Codex，以微月光為鏡，記錄、整理、分析每個時間點的文字、作品與轉折。</strong></p>
        <p>以微弱的月光，照在每個時間點，你的創作文字上。當微光慢慢集中變亮，你也將綻放自己的光芒。</p>
        <p>所以是以月為典：<strong>Luna Codex，LOC／月典</strong>。藉由關係脈絡分析，找出時間長河裡的存在軌跡，組合成屬於你自己的文化風格——你的世界，自己的風格。</p>
        <p>LOC 是一套以 Next.js 與 Neon 為基礎的工具系統，配上簡單分類的月之符文作為參考。它提供免費整理，只供參考，不作裁決：系統幫你看見自己的軌跡，但不替你決定你是誰。</p>
        <p>那 24 個字是我的人生觀。凡人都無法做到完全客觀，因為每個人始終有自己的立場，自私也是理所當然。工具不同；工具只是冷冰冰的工具，不會叫你聽命，也不會叫你忤逆。工具可以協助整理與分析，但它的立場不等於人的立場。</p>
        <p><strong>LOC 的核心定義：</strong>免費整理、只供參考、不裁決。由關係脈絡、時間軌跡與作品資料組合出文化風格，讓每個人看見自己的世界如何形成。</p>
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
      id:'contact',
      eyebrow:'Contact',
      title:'聯絡方式',
      content:<><p>合作、顧問、系統設計、數位遺產管理或其他公開內容相關事項，請透過電子郵件聯絡。</p><p><a href="mailto:sopa2306@gmail.com">sopa2306@gmail.com</a></p></>
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
    {
      id:'lunarunes-reels',
      eyebrow:'Reels',
      title:'公開 Reels',
      content:<div className="loc-context-list"><article className="loc-context-item"><strong>月之符文公開占卜示範</strong><p><a href="https://www.instagram.com/reel/DMA9yDAzeRK/" target="_blank" rel="noopener noreferrer">在 Instagram 查看第一支 Reels →</a></p></article><article className="loc-context-item"><strong>月之符文使用示範</strong><p><a href="https://www.instagram.com/reel/DMA-ZxLTINw/" target="_blank" rel="noopener noreferrer">在 Instagram 查看第二支 Reels →</a></p></article></div>
    }
  ];

  const sectionGroups=Object.freeze({
    style:Object.freeze(['roles','profile-content']),
    work:Object.freeze(['functions','work','digital-legacy']),
    design:Object.freeze(['governance-root','loc','open-source']),
    galaxy:Object.freeze(['corpus','reels','lunarunes-reels','micro-moonlight']),
    others:Object.freeze(['philosophy','name-origin','calibration']),
    email:Object.freeze(['contact','official-links'])
  });
  const activeSections=section&&sectionGroups[section]
    ?sections.filter(item=>sectionGroups[section].includes(item.id))
    :sections;
  return <PageComposition
    eyebrow="Author"
    title="王政德"
    subtitle="Lucas Oscar Wang · lo3rwang"
    intro={<><div className="loc-author-reel"><iframe src="https://www.instagram.com/p/DdX5ki-oZY6/embed" title="這就是我｜王政德自我介紹" loading="eager" allowTransparency="true" frameBorder="0" scrolling="no"/></div><p>不認識我？沒關係！先聽首歌吧。</p><p><a href="https://www.instagram.com/p/DdX5ki-oZY6/" target="_blank" rel="noopener noreferrer">在 Instagram 開啟〈這就是我〉 →</a></p><p><a href="https://suno.com/s/AdpORl6l79UYLcor" target="_blank" rel="noopener noreferrer">聽〈這就是我〉 →</a></p></>}
    localMenu={[['簡介跟自述','/lo3rwang'],['主要身份','/lo3rwang/style'],['工作與合作','/lo3rwang/work'],['LOC設計理念','/lo3rwang/design'],['公開創作內容','/lo3rwang/galaxy'],['其他說明','/lo3rwang/others'],['聯絡方式','/lo3rwang/email']].map(([label,href])=>({label,href}))}
    sections={activeSections}
  />;
}
