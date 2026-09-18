export const metadata = {
  title: '王政德｜Lucas Oscar Wang / lo3rwang',
  description: '王政德（Lucas Oscar Wang / lo3rwang）個人首頁：文字工匠、校對者、語言治理架構者。'
};

const ROOT = [
  '鑑古知今，求同存異',
  '不在其位，不謀其政',
  '隨心所欲，而不逾己'
];

export default function Lo3rwangPage() {
  return (
    <main className="loc-next-main">
      <section className="loc-view">
        <header className="loc-hero" id="top">
          <p className="loc-eyebrow">lo3rwang</p>
          <h1>王政德</h1>
          <p className="loc-subtitle">Lucas Oscar Wang · lo3rwang</p>
          <p>對我很陌生？沒關係，可以先聽首歌，再決定要不要繼續認識我。</p>
          <p><a href="https://suno.com/s/AdpORl6l79UYLcor" target="_blank" rel="noopener noreferrer">聽首歌</a></p>
        </header>

        <section className="loc-card" id="governance-root">
          <p className="loc-eyebrow">Governance Root</p>
          <h2>我的 24 個字</h2>
          {ROOT.map((line) => <p className="loc-core-line" key={line}>{line}</p>)}
          <p>這是我的人生觀與自我治理方式，不要求別人接受相同分類或價值判斷。</p>
          <p><a href="/lo3rwang/governance">查看 lo3rwang 治理與詳細說明</a></p>
        </section>

        <section className="loc-card" id="zhengde-style">
          <p className="loc-eyebrow">Zhengde Style · 政德風</p>
          <h2>真實，比喊得很亮更重要</h2>
          <p>政德風重視真實而細膩地描述情感與現實，不把希望寫成保證，也不要求人一定照著某個答案前進。比起好高騖遠的口號，更傾向提出平易近人、具體、在當下可能做得到的小建議；不去做也可以，選擇權仍然留給自己。</p>
          <p><strong>微月光</strong>是這種態度最早也最具代表性的意象：它不是強烈到要求所有人跟隨的希望之光，而是一道溫暖、渺小、可以參考的光。月光不命令人往哪裡走，只是在最深的夜裡、迷失方向的時候，提供一點能辨認道路的亮度。</p>
          <p className="loc-core-line">不求成為你心中唯一的那道光；只願你在最深的夜裡迷失方向時，這道微月光能幫你看見一條可能走得出去的路。</p>
          <p>這個方向不保證一定正確。我的角色比較接近提供分析、經驗與建議，讓需要的人多一個可以校對自己的角度；最後怎麼走，仍由每個人自己決定。</p>
          <p><a href="/zhengde">查看政德文化與風格演化</a></p>
        </section>

        <section className="loc-card" id="creative-context">
          <p className="loc-eyebrow">Context · 個人創作脈絡</p>
          <h2>我不是在找一個唯一答案，而是在整理自己走過的路</h2>
          <p>早期使用 Suno 時，我也只是像學生一樣摸索；先學工具，再慢慢發現自己擅長的是節拍、句子落點與情緒推進。之後有了微月光、暗影篇章、浪潮、白晝之月、人生月台，再走到自由的風與現在的自由的月。</p>
          <p>這些作品不是一條「越來越成功」的線，而是一條把經驗說清楚的線：低潮可以被描述，關係可以有邊界，未知可以被允許，過去可以被整理。成功不是終點，真正重要的是成功之後怎麼生活、怎麼選擇、怎麼治理自己。</p>
          <p>我已經經過不少月台。LOC 對我來說，很像把沿途看到的站名、路線、轉乘與時刻整理成一份可查詢的時刻表：不是告訴別人一定要搭哪班車，而是讓需要的人知道還有哪些可能，可以拿來校對自己的方向。</p>
          <p className="loc-core-line">不知道 → 學習 → 找到節奏 → 描寫情感 → 校對現實 → 接受轉換 → 保留可能 → 治理自己</p>
          <p><a href="/zhengde#creative-lineage">查看完整創作脈絡</a></p>
        </section>

        <section className="loc-card" id="roles">
          <p className="loc-eyebrow">Roles</p>
          <h2>三個自我稱號</h2>
          <div className="loc-grid three">
            <article><strong>文字工匠 · Wordsmith</strong><p>對應脈絡。從詞、句子與關鍵詞的聯繫，整理文字怎麼形成自己的語意與風格。</p><p><a href="/context">看脈絡</a></p></article>
            <article><strong>校對者 · Calibrator</strong><p>對應文化。把文字放回來源、時間與歷史裡比較，觀察延續、改變、消失、矛盾與可能的污染。</p><p><a href="/evolution">看文化</a></p></article>
            <article><strong>語言治理架構者 · Language Governance Architect</strong><p>對應整體架構。把語彙、脈絡、文化、搜尋與治理組織成可以持續使用的語言系統。</p><p><a href="/loc">看架構</a></p></article>
          </div>
        </section>
      </section>
    </main>
  );
}
