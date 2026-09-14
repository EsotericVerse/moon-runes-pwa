import './rune-atlas-governance.css';
import RuneDrawClient from './RuneDrawClient';
import { RUNES_HOME_CONTENT } from './home-content';

export const metadata = {
  title: '月之符文｜LOC',
  description: '月之符文抽牌、分類參考與基本使用方式。'
};

function RunesIntro() {
  const { relation, modes, reference } = RUNES_HOME_CONTENT;
  return <>
    <section className="loc-card" aria-labelledby="runes-relation-title">
      <p className="loc-eyebrow">{relation.eyebrow}</p>
      <h1 id="runes-relation-title">{relation.title}</h1>
      {relation.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      <p><strong>{relation.note}</strong></p>
    </section>

    <section className="loc-card" aria-labelledby="runes-modes-title">
      <p className="loc-eyebrow">{modes.eyebrow}</p>
      <h2 id="runes-modes-title">{modes.title}</h2>
      <p>{modes.intro}</p>
      <div className="runes-mode-overview">
        {modes.items.map(item => <article key={item.label}>
          <strong>{item.label}</strong>
          <span>{item.text}</span>
        </article>)}
      </div>
      <p className="runes-home-note">{modes.note}</p>
    </section>

    <section className="loc-card" aria-labelledby="runes-reference-title">
      <p className="loc-eyebrow">{reference.eyebrow}</p>
      <h2 id="runes-reference-title">{reference.title}</h2>
      <p>{reference.text}</p>
    </section>
  </>;
}

export default function RunesPage() {
  return <>
    <RunesIntro />
    <nav className="loc-card" aria-label="月之符文功能入口">
      <a href="/runes">抽牌</a> · <a href="/runes/list">所有符文列表</a> · <a href="/runes/history">抽籤紀錄</a>
    </nav>
    <RuneDrawClient/>
  </>;
}
