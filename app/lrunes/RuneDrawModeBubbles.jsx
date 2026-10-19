import {navigationHref} from '../modular/scope-registry.js';
import useNativeNavigation from '../modular/use-native-navigation';
import {RUNE_DRAW_MODES} from './rune-draw-modes.mjs';

export default function RuneDrawModeBubbles({activeKey=''}) {
  const native=useNativeNavigation();
  return <div className="home-draw-bubbles" aria-label="選擇抽牌方式">
    {RUNE_DRAW_MODES.map(item=><a
      className="loc-bubble"
      key={item.key}
      href={navigationHref('lrunes',item.path,native)}
      aria-current={item.key===activeKey?'page':undefined}
    >
      <strong>{item.label}</strong>
      <p>{item.description}</p>
    </a>)}
  </div>;
}
