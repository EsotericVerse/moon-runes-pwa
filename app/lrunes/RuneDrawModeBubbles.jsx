import {scopeHref} from '../modular/scope-registry';
import {RUNE_DRAW_MODES} from './rune-draw-modes.mjs';

export default function RuneDrawModeBubbles({activeKey=''}) {
  return <div className="home-draw-bubbles" aria-label="選擇抽牌方式">
    {RUNE_DRAW_MODES.map(item=><a
      className="loc-bubble"
      key={item.key}
      href={scopeHref('lrunes',item.path)}
      aria-current={item.key===activeKey?'page':undefined}
    >
      <strong>{item.label}</strong>
      <p>{item.description}</p>
    </a>)}
  </div>;
}
