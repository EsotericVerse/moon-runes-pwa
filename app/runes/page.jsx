import './rune-atlas-governance.css';
import './runes-content.css';
import RuneDrawClient from './RuneDrawClient';
import { RUNES_HOME_CONTENT } from './home-content';

export const metadata = {
  title: '月之符文｜LOC',
  description: '月之符文抽牌、分類參考與基本使用方式。'
};

function HighlightGrid({ items, label }) {
  return <div className="runes-highlight-grid" aria-label={label}>
    {items.map(item => {
      const body = <>
        <strong>{item.label}</strong>
        <span>{item.text}</span>
      </>;
      return item.href
        ? <a className="runes-highlight-bubble interactive" href={item.href} key={item.label}>{body}</a>
        : <article className="runes-highlight-bubble" key={item.label}>{body}</article>;
    })}
  </div>;
}

function ContentSection({ data, level = 2, id }) {
  const Heading = level === 1 ? 'h1' : 'h2';
  const headingId = `${id}-title`;
  return <section className="loc-card runes-content-section" id={id} aria-labelledby={headingId}>
    <div className="runes-content-heading">
      <p className="loc-eyebrow">{data.eyebrow}</p>
      <Heading id={headingId}>{data.title}</Heading>
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
    <ContentSection data={relation} level={1} id="runes-relation" />
    <ContentSection data={modes} id="runes-modes" />
    <ContentSection data={reference} id="runes-reference" />
  </>;
}

export default function RunesPage() {
  return <>
    <RunesIntro />
    <nav className="loc-card runes-function-nav" aria-label="月之符文功能入口">
      <a href="#draw">抽牌</a> · <a href="/runes/list">符文圖鑑</a> · <a href="/game">遊戲</a> · <a href="/context">符文脈絡</a> · <a href="/statics">符文統計</a> · <a href="/evolution">符文文化</a> · <a href="/runes/history">抽籤紀錄</a>
    </nav>
    <RuneDrawClient/>
  </>;
}
