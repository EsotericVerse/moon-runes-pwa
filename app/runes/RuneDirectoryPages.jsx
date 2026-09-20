import {GROUPS,groupById,groupRunes,localRuneId,runeByRoute,runeImage,runeName} from './rune-directory.mjs';
import {scopeHrefV2} from '../modular-v2/scope-registry.v2';

const listHref=(path='')=>scopeHrefV2('runes',`list${path?'/'+String(path).replace(/^\/+/, ''):''}`);

function RuneDetails({card}){
  if(!card)return null;
  return <article className="loc-card">
    <div className="runes-library-card">
      <img className="loc-rune-card-image" src={runeImage(card)} alt={`${runeName(card)}之符文卡`}/>
      <div className="runes-library-card-copy">
        <h2>{String(Number(card.編號)).padStart(2,'0')} · {runeName(card)}之符文 · {card.英文}</h2>
        <p>{card.符文說明}</p>
        <p>{card.人格原型}</p>
      </div>
    </div>
    <div className="runes-rune-detail-grid">
      <span><strong>所屬分組</strong>{card.所屬分組||'—'}</span>
      <span><strong>月相</strong>{card.月相||'—'}</span>
      <span><strong>卡片屬性</strong>{card.卡片屬性||'—'}</span>
      <span><strong>正向關鍵詞</strong>{card.正向關鍵詞||'—'}</span>
      <span><strong>反向關鍵詞</strong>{card.反向關鍵詞||'—'}</span>
      {card.額外規則?<span><strong>額外規則</strong>{card.額外規則}</span>:null}
      {card.額外留意?<span><strong>額外留意</strong>{card.額外留意}</span>:null}
    </div>
    <div className="runes-rune-directions">
      <p><strong>正位：</strong>{card.正向表示||'—'}</p>
      <p><strong>半正位：</strong>{card.半正向表示||'—'}</p>
      <p><strong>半逆位：</strong>{card.半逆向表示||'—'}</p>
      <p><strong>逆位：</strong>{card.逆向表示||'—'}</p>
    </div>
  </article>;
}

export function RuneDirectoryRoot(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Rune Atlas · 符文圖鑑</p>
      <h1>月之符文圖鑑</h1>
      <p className="loc-subtitle">總圖與群組入口。入口頁不直接展開 1–66 符文列表。</p>
    </header>
    <section className="loc-card">
      <figure className="runes-atlas-overview">
        <img src="/assets/lunarunes/reference/loc_runes_66_overview.jpg" alt="月之符文 66 符總圖" loading="eager"/>
        <figcaption>月之符文 66 符總圖</figcaption>
      </figure>
    </section>
    <section className="loc-card">
      <p className="loc-eyebrow">Rune Groups</p>
      <h2>群組列表</h2>
      <div className="runes-group-picker">
        {GROUPS.map(group=><a key={group.id} className="runes-group-choice" href={listHref(`${group.id}/`)}>
          <img src={group.image} alt={`${group.name}組概念圖`} width="144" height="96" loading="lazy"/>
          <span className="runes-group-choice-copy">
            <strong>{group.id} · {group.name} ({group.english})</strong>
            <small>{group.description}</small>
          </span>
        </a>)}
      </div>
    </section>
  </section></main>;
}

export function RuneGroupPage({groupId}){
  const group=groupById(groupId);
  if(!group)return null;
  const cards=groupRunes(group.id);
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Rune Group · {group.id}</p>
      <h1>{group.name}組 · {group.english}</h1>
      <p className="loc-subtitle">{group.description}</p>
    </header>
    <section className="loc-card">
      <div className="runes-group-head">
        <img src={group.image} alt={`${group.name}組概念圖`} width="160" height="120"/>
        <div>
          <h2>{group.name}組資訊</h2>
          <p>{group.description}</p>
          <p>符文構成：{cards.map(card=>runeName(card)).join('、')}</p>
        </div>
      </div>
    </section>
    <section className="loc-card">
      <p className="loc-eyebrow">Runes</p>
      <h2>符文</h2>
      <div className="runes-library-grid">
        {cards.map(card=>{
          const localId=localRuneId(group.id,card);
          return <a className="runes-library-card" key={`${group.id}-${localId}`} href={listHref(`${group.id}/${localId}/`)}>
            <img className="runes-library-thumb" src={runeImage(card)} alt={`${runeName(card)}之符文卡`} width="72" height="72" loading="lazy"/>
            <span className="runes-library-card-copy">
              <strong>{localId} · {runeName(card)}之符文 {card.英文? `(${card.英文})`:''}</strong>
              <small>{card.符文說明||''}</small>
            </span>
          </a>;
        })}
      </div>
    </section>
    <nav className="loc-card"><a href={listHref()}>回符文圖鑑</a></nav>
  </section></main>;
}

export function RuneDetailPage({groupId,runeId}){
  const group=groupById(groupId);
  const card=runeByRoute(groupId,runeId);
  if(!group||!card)return null;
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Rune · {group.id}/{String(runeId).padStart(2,'0')}</p>
      <h1>{runeName(card)}之符文</h1>
      <p className="loc-subtitle">{group.name}組 · {card.英文}</p>
    </header>
    <RuneDetails card={card}/>
    <nav className="loc-card"><a href={listHref(`${group.id}/`)}>回{group.name}組</a> · <a href={listHref()}>回符文圖鑑</a></nav>
  </section></main>;
}
