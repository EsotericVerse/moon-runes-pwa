'use client';

import Select from 'react-select';
import {scopeOriginV2} from '../modular-v2/scope-registry.v2';

const runeHref=path=>`${scopeOriginV2('lunarunes')}/${String(path||'').replace(/^\/+/, '')}`;

const HOME_FUNCTION_OPTIONS=Object.freeze([
  {value:'list',label:'符文圖鑑',href:runeHref('list')},
  {value:'log',label:'每日紀錄',href:runeHref('daily/log')},
  {value:'trend',label:'每日趨勢',href:runeHref('daily/trend')},
  {value:'game',label:'符文遊戲',href:runeHref('game')}
]);

const DRAW_MODE_OPTIONS=Object.freeze([
  {value:'single',label:'單卡',href:runeHref('duel/one')},
  {value:'daily',label:'每日符文',href:runeHref('duel/daily')},
  {value:'two',label:'雙卡',href:runeHref('duel/two')},
  {value:'three',label:'三卡',href:runeHref('duel/three')},
  {value:'five',label:'五卡',href:runeHref('duel/five')},
  {value:'ow3gs',label:'11卡 OW3gs',href:runeHref('duel/ow3gs')}
]);

function openOption(option){
  if(option?.href)window.location.assign(option.href);
}

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
        <div className="runes-home-function-select" aria-label="月之符文抽牌方式">
          <Select
            inputId="lunarunes-draw-mode"
            className="scope-v2-react-select"
            classNamePrefix="scope-v2-react-select"
            unstyled
            isSearchable={false}
            options={DRAW_MODE_OPTIONS}
            value={null}
            placeholder="選擇抽牌方式"
            onChange={openOption}
          />
        </div>
        <div className="runes-home-function-select" aria-label="月之符文其他功能">
          <Select
            inputId="lunarunes-home-function"
            className="scope-v2-react-select"
            classNamePrefix="scope-v2-react-select"
            unstyled
            isSearchable={false}
            options={HOME_FUNCTION_OPTIONS}
            value={null}
            placeholder="其他功能"
            onChange={openOption}
          />
        </div>
      </div>
      <figure className="home-hero-visual scope-home-hero-visual">
        <iframe src="https://www.instagram.com/reel/DMA-ZxLTINw/embed" title="月之符文說明" loading="eager" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" />
      </figure>
    </header>

    <section className="loc-card rune-basics">
      <h2>基本判讀順序</h2>
      <div className="home-author-copy">
        <p><strong>先看符文本義：</strong>先確認每張符文最基本的語意，不先被吉凶或結論帶走。</p>
        <p><strong>再看卡牌方向：</strong>正位、半正位、半逆位、逆位描述同一語彙在當下狀態中的不同表現。</p>
        <p><strong>依卡位讀結構：</strong>雙卡、三卡、五卡與 OW3gs 都有自己的位置責任，不能混成同一種讀法。</p>
        <p><strong>最後才看月相：</strong>真實月相是次要的時間修飾，不應推翻符文本義、方向與主要卡位。</p>
      </div>
    </section>

    <section className="loc-card rune-basics">
      <h2>命運句基本結構</h2>
      <div className="home-author-copy">
        <p><strong>單卡：</strong>回答當下最核心的語意或狀態。</p>
        <p><strong>雙卡：</strong><strong>因 → 果</strong>。第一張描述造成狀況的來源，第二張描述主要結果或落點。</p>
        <p><strong>三卡：</strong><strong>源 → 轉 → 合</strong>。從來源、轉折到整合結果，形成一條最基本的語意鏈。</p>
        <p><strong>五卡：</strong><strong>雙卡＋單卡＋雙卡</strong>。兩張過去成因＋一個意外變化＋兩張現在狀況，不是「兩卡＋三卡」的拼接。</p>
        <p><strong>OW3gs：</strong><strong>1–6 因的描述層＋7–11 果的判定層</strong>。先讀 7–11 的核心判定，再回看 1–6 補足造成現況的背景與條件。</p>
      </div>
    </section>

    <section className="loc-card rune-basics">
      <h2>判讀與回測原則</h2>
      <div className="home-author-copy">
        <p><strong>過程不等於結果：</strong>過程順利、互動正向或局部條件成立，不代表最後一定形成預期結果。</p>
        <p><strong>多個結果可以並存：</strong>成果、延遲、成本、補償與限制可以同時成立，不把複合事件壓成單一吉凶。</p>
        <p><strong>主結果與代價分開：</strong>是否完成、完成品質、時間、金錢、情緒與體力成本應分開判讀。</p>
        <p><strong>不知道就保留未知：</strong>尚未走完的時間跨度、證據不足或原始解析遺失時，不事後補造答案。</p>
      </div>
    </section>
  </section></main>;
}
