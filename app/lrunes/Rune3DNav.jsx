'use client';

import {navigationHref} from '../modular/scope-registry.js';
import useNativeNavigation from '../modular/use-native-navigation';

export default function RuneArtNav(){
  const native=useNativeNavigation();
  return <nav className="runes-home-nav" aria-label="符文三大功能入口">
    <a className="loc-button" href={navigationHref('lrunes','',native)}>← 回符文首頁</a>
    <a className="loc-button" href={navigationHref('lrunes','card/duel',native)}>抽牌 · 選擇 2D／3D</a>
    <a className="loc-button" href={navigationHref('lrunes','card/list',native)}>符文圖鑑 · 選擇 2D／3D</a>
    <a className="loc-button" href={navigationHref('lrunes','card/daily',native)}>每日符文 · 選擇 2D／3D</a>
  </nav>;
}
