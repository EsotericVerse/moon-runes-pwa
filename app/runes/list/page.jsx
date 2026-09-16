import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LOC_DATA } from '../../loc/data-paths.mjs';

const runeSourcePath = resolve(process.cwd(), LOC_DATA.RUNES.replace(/^\//, ''));
const runes = JSON.parse(readFileSync(runeSourcePath, 'utf8'));

export const metadata = {
  title: '所有符文列表｜月之符文｜LOC',
  description: '月之符文 1–66 完整列表。'
};

function runeCardImage(card) {
  const number = String(Number(card?.編號) || 0).padStart(2, '0');
  const name = String(card?.符文名稱 || '').replace(/之符文$/, '').trim();
  return `/assets/lunarunes/cards/${number}_${name}.png`;
}

export default function RuneListPage() {
  const canonicalRunes = (runes || [])
    .filter(row => Number(row?.編號) >= 1 && Number(row?.編號) <= 66)
    .sort((a, b) => Number(a.編號) - Number(b.編號));

  return <main className="loc-next-main">
    <section className="loc-view">
      <header className="loc-hero">
        <p className="loc-eyebrow">LunaRunes · 月之符文</p>
        <h1>所有符文列表</h1>
        <p>月之符文 1–66 的完整列表。資料直接取自現行核心符文資料，不另建副本。</p>
      </header>

      <nav className="loc-card" aria-label="月之符文功能入口">
        <a href="/runes#draw">抽牌</a> · <a href="/runes#library">符文圖鑑</a> · <strong>所有符文列表</strong>
      </nav>

      <section className="loc-card" id="rune-list">
        <p className="loc-eyebrow">66 Runes · 完整列表</p>
        <h2>1–66</h2>
        <div className="loc-context-list">
          {canonicalRunes.map(card => <article className="loc-context-item" id={`rune-${card.編號}`} key={card.編號}>
            <img className="loc-rune-card-image" src={runeCardImage(card)} alt={`${card.符文名稱}符文卡`} />
            <strong>{String(Number(card.編號)).padStart(2, '0')} · {card.符文名稱} · {card.英文}</strong>
            <span>{card.所屬分組} · {card.月相} · {card.卡片屬性}</span>
            <span>{card.符文說明}</span>
            <span><b>正向關鍵詞：</b>{card.正向關鍵詞 || '—'}</span>
            <span><b>反向關鍵詞：</b>{card.反向關鍵詞 || '—'}</span>
          </article>)}
        </div>
      </section>
    </section>
  </main>;
}
