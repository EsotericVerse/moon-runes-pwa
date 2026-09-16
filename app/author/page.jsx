export const metadata = {
  title: '王政德｜Lucas Oscar Wang / lo3rwang',
  description: '王政德（Lucas Oscar Wang / lo3rwang）作者首頁：Wordsmith · Moon Resonator · Calibrator；LOC／月典創作者與 Language Governance Architect。'
};

const ROOT = [
  '鑑古知今，求同存異',
  '不在其位，不謀其政',
  '隨心所欲，而不逾己'
];

export default function AuthorPage() {
  return (
    <main className="loc-next-main">
      <section className="loc-view">
        <header className="loc-hero" id="top">
          <p className="loc-eyebrow">Author · lo3rwang</p>
          <h1>王政德</h1>
          <p className="loc-subtitle">Lucas Oscar Wang / lo3rwang</p>
          <p className="loc-core-line">Wordsmith · Moon Resonator · Calibrator</p>
          <p>LOC／月典創作者、Language Governance Architect。寫文字、做音樂，也整理自己的語言、作品與歷史。</p>
        </header>

        <section className="loc-card" id="governance-root">
          <p className="loc-eyebrow">Governance Root · 24</p>
          <h2>我的 24 個字</h2>
          {ROOT.map((line) => <p className="loc-core-line" key={line}>{line}</p>)}
          <p>這是我的人生觀與自我治理方式，不要求別人接受相同分類或價值判斷。細部脈絡與命名來源放在作者治理。</p>
          <p><a href="/author/governance">查看作者治理與詳細說明</a></p>
        </section>

        <section className="loc-card" id="style-reference">
          <p className="loc-eyebrow">Style Reference</p>
          <h2>風格參考</h2>
          <p>常見於我的文字與作品：感性與理性交錯、月與時間意象、短句與節奏、自我治理、邊界、選擇，以及把過去重新放回現在理解。</p>
          <p>「政德風」首先是我的自我描述，不是要求外部採用的唯一分類；不同解讀可以並存。</p>
        </section>
      </section>
    </main>
  );
}
