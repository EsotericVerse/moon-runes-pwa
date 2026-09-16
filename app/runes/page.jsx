import './rune-atlas-governance.css';
import './runes-content.css';
import RuneDrawClient from './RuneDrawClient';
import RuneAtlasHome from './RuneAtlasHome';
import { RUNES_HOME_CONTENT } from './home-content';

export const metadata = {
  title: '月之符文｜LOC',
  description: '月之符文說明、抽牌與符文圖鑑。'
};

function HighlightGrid({ items, label }) {
  return <div className="runes-highlight-grid" aria-label={label}>
    {items.map(item => {
      const body = <><strong>{item.label}</strong><span>{item.text}</span></>;
      return item.href
        ? <a className="runes-highlight-bubble interactive" href={item.href} key={item.label}>{body}</a>
        : <article className="runes-highlight-bubble" key={item.label}>{body}</article>;
    })}
  </div>;
}

function ContentSection({ data, id }) {
  const headingId = `${id}-title`;
  return <section className="loc-card runes-content-section" id={id} aria-labelledby={headingId}>
    <div className="runes-content-heading">
      <p className="loc-eyebrow">{data.eyebrow}</p>
      <h2 id={headingId}>{data.title}</h2>
      {data.subtitle ? <p className="loc-subtitle">{data.subtitle}</p> : null}
    </div>
    <div className="runes-content-group">
      <h3>重點提示</h3>
      <HighlightGrid items={data.highlights} label={`${data.title}重點提示`} />
    </div>
    <div className="runes-content-group runes-description">
      <h3>文字說明</h3>
      {data.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      {data.note ? <p className="runes-home-note"><strong>{data.note}</strong></p> : null}
    </div>
  </section>;
}

function RunesIntro() {
  const { relation, modes, reference } = RUNES_HOME_CONTENT;
  return <>
    <ContentSection data={relation} id="runes-relation" />
    <ContentSection data={modes} id="runes-modes" />
    <ContentSection data={reference} id="runes-reference" />
  </>;
}

export default function RunesPage() {
  return <main className="loc-next-main">
    <header className="loc-hero runes-home-hero">
      <p className="loc-eyebrow">LunaRunes · 月之符文</p>
      <h1>月之符文</h1>
      <p>符號式語言模組，也是 LOC 的語彙種子。從抽牌或符文圖鑑開始，不需要先背完所有符文。</p>
    </header>
    <nav className="loc-card runes-function-nav" aria-label="月之符文頁內子選單">
      <a href="#draw">抽牌</a> · <a href="#library">符文圖鑑</a>
    </nav>
    <RunesIntro />
    <RuneDrawClient />
    <RuneAtlasHome />
  </main>;
}
