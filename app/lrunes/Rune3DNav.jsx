'use client';
import {navigationHref} from '../modular/nav-destinations.mjs';
import useNativeNavigation from '../modular/use-native-navigation';
export default function Rune3DNav(){
  const native=useNativeNavigation();
  return <nav className="runes-home-nav" aria-label="3D 測試模式">
    <a className="loc-button" href={navigationHref('lrunes','',native)}>回符文首頁</a>
    <a className="loc-button" href={navigationHref('lrunes','card3d/duel',native)}>3D 抽牌</a>
    <a className="loc-button" href={navigationHref('lrunes','card3d/daily',native)}>3D 每日符文</a>
    <a className="loc-button" href={navigationHref('lrunes','card3d/list',native)}>3D 圖鑑</a>
    <a className="loc-button" href={navigationHref('lrunes','card',native)}>目前 2D 版本</a>
  </nav>;
}
