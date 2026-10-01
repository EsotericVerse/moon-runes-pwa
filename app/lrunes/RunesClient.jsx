'use client';

import Select from 'react-select';
import {scopeOriginV2} from '../modular-v2/scope-registry.v2';
import DailyRuneCalendar from './DailyRuneCalendar';

const runeHref=path=>`${scopeOriginV2('lunarunes')}/${String(path||'').replace(/^\\/+/, '')}`;

const HOME_RUNE_OPTIONS=Object.freeze([
  {value:'list',label:'符文圖鑑',href:runeHref('list')},
  {value:'draw',label:'符文抽籤',href:runeHref('duel/one')}
]);

const HOME_DAILY_OPTIONS=Object.freeze([
  {value:'daily',label:'每日符文',href:runeHref('duel/daily')},
  {value:'log',label:'每日符文紀錄',href:runeHref('daily/log')},
  {value:'trend',label:'每日符文趨勢',href:runeHref('daily/trend')}
]);

export default function RunesClient(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero scope-home-hero-with-visual" id="intro">
      <div className="scope-home-hero-copy">
        <p className="loc-eyebrow">月之符文</p>
        <div className="home-title-row">
          <h1>月之符文</h1>
          <p className="loc-subtitle">以月的角度紀錄。</p>
        </div>
        <p>66個單一中文字 × 九組符文分組 × 四卡牌方向 × 月相交互</p>
        <p>可以問一件事，也可以沒有問題直接抽取。</p>
        <div className="runes-home-function-select" aria-label="月之符文功能選單">
          <Select
            inputId="lunarunes-home-rune-function"
            className="scope-v2-react-select"
            classNamePrefix="scope-v2-react-select"
            unstyled
            isSearchable={false}
            options={HOME_RUNE_OPTIONS}
            value={null}
            placeholder="符文功能"
            onChange={option=>option?.href&&window.location.assign(option.href)}
          />
          <Select
            inputId="lunarunes-home-daily-function"
            className="scope-v2-react-select"
            classNamePrefix="scope-v2-react-select"
            unstyled
            isSearchable={false}
            options={HOME_DAILY_OPTIONS}
            value={null}
            placeholder="每日符文"
            onChange={option=>option?.href&&window.location.assign(option.href)}
          />
          <a className="loc-button runes-home-game-link" href={runeHref('game')}>符文遊戲</a>
        </div>
      </div>
      <figure className="home-hero-visual scope-home-hero-visual">
        <iframe src="https://www.instagram.com/reel/DMA-ZxLTINw/embed" title="月之符文說明" loading="eager" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" />
      </figure>
    </header>

    <DailyRuneCalendar />
  </section></main>;
}
