'use client';

import {navigationHref} from '../modular/nav-destinations.mjs';
import useNativeNavigation from '../modular/use-native-navigation';

export default function Rune3DNav(){
  const native=useNativeNavigation();
  return <nav className="runes-home-nav" aria-label="3D 場域模式">
    <a className="loc-button" href={navigationHref('lrunes','',native)}>← 回符文首頁</a>
    <a className="loc-button" href={navigationHref('lrunes','card/duel',native)}>隨機抽牌 · 3D 召喚</a>
    <a className="loc-button" href={navigationHref('lrunes','card/list',native)}>指定符文 · 3D 圖鑑</a>
    <a className="loc-button" href={navigationHref('lrunes','card/daily',native)}>每日符文 · 3D 指示</a>
  </nav>;
}
