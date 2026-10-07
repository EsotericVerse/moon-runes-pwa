import ScopeEditableBlocks from '../ScopeEditableBlocks';

function AuthorPage({eyebrow,title,subtitle,intro,heroVisual=null,sections=[]}){
  return <section className="loc-view scope-home-composition">
    {heroVisual?<header className="loc-hero scope-home-hero-with-visual" id="top">
      <div className="scope-home-hero-copy">
        {eyebrow?<p className="loc-eyebrow">{eyebrow}</p>:null}
        <div className="home-title-row"><h1>{title}</h1>{subtitle?<p className="loc-subtitle">{subtitle}</p>:null}</div>
        {intro}
      </div>
      <figure className="home-hero-visual scope-home-hero-visual">{heroVisual}</figure>
    </header>:<header className="loc-hero loc-hero-feature" id="top">
      {eyebrow?<p className="loc-eyebrow">{eyebrow}</p>:null}
      <div className="home-title-row"><h1>{title}</h1>{subtitle?<p className="loc-subtitle">{subtitle}</p>:null}</div>
      {intro}
    </header>}
    {sections.map((section,index)=><section className="loc-card scope-home-section" id={section.id} key={section.id} data-composition-slot={index+1}>
      {section.eyebrow?<p className="loc-eyebrow">{section.eyebrow}</p>:null}
      <h2>{section.title}</h2>
      {section.content}
    </section>)}
  </section>;
}

const PROFESSIONAL_ROLES=Object.freeze([
  Object.freeze({
    title:'文字工匠 · Wordsmith',
    text:'針對單一語彙與單詞，會很執著於找出它在句中的本義。因為本義要先確認，才能知道句子的整體解釋。'
  }),
  Object.freeze({
    title:'混沌校對者 · Chaos Calibrator',
    text:'針對一團混亂的狀態，會以系統性的方式找尋規則性，進而拆解與破解；也延伸到對未來的風險管理。'
  }),
  Object.freeze({
    title:'語言建築師 · Language Architect',
    text:'對語言使用的綜合應用。例：良心，若是涼心又何必量心。不好意思，若不好就意思意思一下就好。這就是文字建築學。'
  })
]);

const OFFICIAL_LINKS=Object.freeze([
  Object.freeze({label:'LinkedIn',href:'https://www.linkedin.com/in/lo3rwang/'}),
  Object.freeze({label:'Instagram',href:'https://www.instagram.com/lo3rwang/'}),
  Object.freeze({label:'Threads',href:'https://www.threads.com/@lo3rwang'})
]);

function ProfessionalRoles(){
  return <div className="author-role-grid">
    {PROFESSIONAL_ROLES.map(item=><article className="author-editorial-block" key={item.title}>
      <h3>{item.title}</h3>
      <p>{item.text}</p>
    </article>)}
  </div>;
}

function WorkCopy(){
  return <>
    <p>目前以 <strong>Language Architect</strong> 為主要專業定位；對外合作可依個案採語言顧問、系統設計或專案實作方式進行。</p>
    <p>工作內容包括命名與正名、語意與分類設計、知識與資料架構、規則整理、版本與關係設計，以及既有系統裡的語意衝突與結構問題。</p>
  </>;
}

function DigitalAssetCopy(){
  return <>
    <p>另一個長期方向是數位資產管理：整理個人、創作者或組織長期累積的文字、照片、影音、作品、帳號資料、版本與歷史紀錄，讓散落內容重新形成可搜尋、可追溯、可持續管理的資料脈絡。</p>
  </>;
}

function NameOriginCopy(){
  return <>
    <p><strong>Lucas Oscar Wang 政德</strong> 是目前使用的完整署名，日常仍叫我 Oscar；<strong>lo3rwang</strong> 作為公開識別。</p>
    <p>Lucas 取「光」的意象，Oscar 是長期使用的名字；中文名政德則是目前正式使用的姓名。</p>
    <p>另保留 <strong>dlwang／Lucipher Drucula Wang</strong> 作為陰暗面別名，用來承認不同時期的自己，而不是抹去那些經歷。</p>
  </>;
}

function PhilosophyCopy(){
  return <>
    <p>思想上偏向道教老子體系。這裡所說的「道德」，主要取道家語境中的道與德、天地人，而不是用單一倫理秩序替所有人下判斷。</p>
    <p>實踐態度則接近 Druid 所象徵的自然觀與無為：先觀察、理解與順勢，再決定是否介入。這也是我處理語言、創作與治理時的重要底色。</p>
  </>;
}

function CalibrationCopy(){
  return <>
    <p>時間是一條不可逆的時間長河。年份是定位與比較的參考，不代表經驗會自動依整齊規則排列。</p>
    <p>對我而言，「定錨」不是回到過去，而是在某個時間點留下可辨識的文字與資料位置，再從來源、脈絡與後續變化重新理解不同時期的自己。</p>
    <p>已發生的歷史不能倒回，但可以重新定位；文字紀錄因此成為校對工具，讓現在保有重新選擇未來的空間。</p>
  </>;
}

function SystemsCopy(){
  return <div className="author-system-grid">
    <article className="author-editorial-block">
      <h3>LOC／月典</h3>
      <p>LOC／月典本來就是為文化分析而設計，尤其關注尚未被主流充分理解、仍處在社會與法律分類灰區的次文化。它會先把現象、語言、時間與關係整理清楚，讓這些灰色地帶能更快被看見與理解，並為之後更合適的法律定位提供脈絡與材料。</p>
      <p><a href="https://loc.lo3rwang.cc/">查看 LOC／月典 →</a></p>
    </article>
    <article className="author-editorial-block">
      <h3>LunaRunes／月之符文</h3>
      <p>LunaRunes／月之符文最早從認字學習卡的設計開始，後來逐步發展成一套獨特的符號式語言宇宙，並延伸出「玄宇宙」理論。接下來也準備分別從語言學與工程學整理成論文送審。</p>
      <p><a href="https://lrunes.lo3rwang.cc/">查看 LunaRunes／月之符文 →</a></p>
    </article>
  </div>;
}

function OfficialLinks(){
  return <div className="author-official-links">
    {OFFICIAL_LINKS.map(link=><a href={link.href} target="_blank" rel="noopener noreferrer" key={link.href}>{link.label}</a>)}
  </div>;
}

function ThreeSouls(){
  return <div className="author-trinity-layout">
    <figure className="home-architecture-figure author-trinity-figure">
      <img src="/pics/lo3rwang-3.png" alt="Oscar 政德、玄鑒 Lucas、符韻 Rune，以及柏隆 Bruno、睿汶 Raven 的關係圖" loading="lazy"/>
    </figure>
    <div className="author-trinity-copy">
      <article className="loc-bubble author-trinity-core">
        <h3>Oscar／政德 · 人魂／本體</h3>
        <p>日常稱呼仍是 Oscar。完整署名為 Lucas Oscar Wang 政德，是創作、工作與現實選擇的中心。</p>
      </article>
      <article className="loc-bubble">
        <h3>玄鑒／Lucas · 天魂</h3>
        <p>對應 LOC／月典，字月典。尋找規律與秩序，是為了取得自己的平衡。</p>
      </article>
      <article className="loc-bubble">
        <h3>符韻／Rune · 地魂</h3>
        <p>對應 LunaRunes／月語，字月語。以符文、文字與韻律和未知溝通。</p>
      </article>
      <p className="author-trinity-note"><strong>柏隆／Bruno、睿汶／Raven</strong> 是未來真實兒女的預留命名，不屬於三魂。</p>
    </div>
  </div>;
}

export default function AuthorHomeView({section=null}){
  const detailedSections=[
    {
      id:'roles',
      eyebrow:'Professional Roles',
      title:'三個職能',
      content:<ProfessionalRoles/>
    },
    {
      id:'work',
      eyebrow:'Professional Work',
      title:'語言顧問、語言治理與系統設計',
      content:<WorkCopy/>
    },
    {
      id:'digital-legacy',
      eyebrow:'Digital Assets',
      title:'數位資產管理',
      content:<DigitalAssetCopy/>
    },
    {
      id:'name-origin',
      eyebrow:'Name · Identity',
      title:'Lucas Oscar Wang 政德',
      content:<NameOriginCopy/>
    },
    {
      id:'philosophy',
      eyebrow:'Philosophy',
      title:'思想取向',
      content:<PhilosophyCopy/>
    },
    {
      id:'calibration',
      eyebrow:'Time · Calibration',
      title:'時空定錨論',
      content:<CalibrationCopy/>
    },
  ];

  if(section){
    const sectionGroups=Object.freeze({
      work:Object.freeze(['roles','work','digital-legacy']),
      others:Object.freeze(['name-origin','philosophy','calibration'])
    });
    const ids=sectionGroups[section]||[];
    const activeSections=ids.length?detailedSections.filter(item=>ids.includes(item.id)):detailedSections;
    return <AuthorPage
      eyebrow="Author"
      title="Lucas Oscar Wang 政德"
      subtitle="lo3rwang"
      intro={<p>Hello！你好！你可以叫我 Oscar。</p>}
      sections={activeSections}
    />;
  }

  return <AuthorPage
    eyebrow="Lucas Oscar Wang"
    title="政德"
    subtitle="語言建築師"
    intro={<>
      <p>Hello！你好！你可以叫我 Oscar。</p>
      <p>Wordsmith · Chaos Calibrator · Language Architect</p>
      <p>Creator of LOC and LunaRunes · <a href="https://suno.com/s/AdpORl6l79UYLcor" target="_blank" rel="noopener noreferrer">聽〈這就是我〉 →</a></p>
    </>}
    heroVisual={<iframe src="https://www.instagram.com/p/DdX5ki-oZY6/embed" title="這就是我｜Lucas Oscar Wang 政德自我介紹" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" frameBorder="0" scrolling="no"/>}
    sections={[
      {
        id:'about',
        eyebrow:'About',
        title:'關於我',
        content:<div className="author-about-grid">
          <div className="author-about-primary">
            <ScopeEditableBlocks
              scopeId="lo3rwang"
              field="home_blocks"
              slotClassName="author-editorial-block"
              fallbackDocuments={[
                'Lucas Oscar Wang 政德，日常叫我 Oscar。寫作、音樂、系統整理與到處看看，都是我長期沒有放下的事情。',
                '人生觀：鑑古知今，求同存異。不在其位，不謀其政。隨心所欲，而不逾己。',
                '原則態度：敬畏未知，尊重異者，專業為先。',
                '擅長能力：歸納、整理與系統化；習慣把複雜原理收斂成可以理解與重複使用的結構。'
              ]}
            />
          </div>
          <aside className="author-about-side">
            <h3>名字與識別</h3>
            <p>完整署名是 Lucas Oscar Wang 政德，公開識別為 lo3rwang；日常稱呼仍是 Oscar。</p>
            <h3>思想底色</h3>
            <p>偏向老子體系的道與德，也重視自然、觀察與不以控制取代理解。</p>
          </aside>
        </div>
      },
      {
        id:'professional',
        eyebrow:'Professional',
        title:'我在做什麼',
        content:<>
          <p className="author-section-lead">資訊工程出身。長期程式設計養成的習慣，應用在語言上，就是「物件導向（OOP）」。</p>
          <ProfessionalRoles/>
          <div className="author-professional-grid">
            <article className="author-editorial-block">
              <h3>語言顧問與系統設計</h3>
              <WorkCopy/>
            </article>
            <article className="author-editorial-block">
              <h3>數位資產管理</h3>
              <DigitalAssetCopy/>
            </article>
          </div>
        </>
      },
      {
        id:'systems',
        eyebrow:'Systems',
        title:'LOC 與 LunaRunes',
        content:<SystemsCopy/>
      },
      {
        id:'three-souls',
        eyebrow:'Three Souls',
        title:'三魂',
        content:<ThreeSouls/>
      },
      {
        id:'contact',
        eyebrow:'Contact',
        title:'聯絡與官方連結',
        content:<div className="author-contact-layout">
          <div>
            <p>合作、顧問、系統設計、數位資產管理或其他公開內容相關事項，可透過電子郵件聯絡。</p>
            <p><a href="mailto:sopa2306@gmail.com">sopa2306@gmail.com</a></p>
          </div>
          <OfficialLinks/>
        </div>
      }
    ]}
  />;
}
