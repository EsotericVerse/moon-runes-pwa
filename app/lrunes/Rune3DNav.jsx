'use client';

import {navigationHref} from '../modular/nav-destinations.mjs';
import useNativeNavigation from '../modular/use-native-navigation';

export default function RuneArtNav(){
  const native=useNativeNavigation();
  return <nav className="runes-home-nav" aria-label="原創美術展示模式">
    <a className="loc-button" href={navigationHref('lrunes','',native)}>← 回符文首頁</a>
    <a className="loc-button" href={navigationHref('lrunes','card/duel',native)}>隨機抽牌 · 月光召喚</a>
    <a className="loc-button" href={navigationHref('lrunes','card/list',native)}>指定符文 · 原創畫廊</a>
    <a className="loc-button" href={navigationHref('lrunes','card/daily',native)}>每日符文 · 月光指示</a>
  </nav>;
}
