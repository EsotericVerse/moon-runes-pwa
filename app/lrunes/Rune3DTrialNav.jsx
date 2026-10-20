'use client';
import {navigationHref} from '../modular/scope-registry.js';
import useNativeNavigation from '../modular/use-native-navigation';
import ScopeLink from '../modular/ScopeLink';
export default function Rune3DTrialNav(){
  const native=useNativeNavigation();
  return <nav className="runes-home-nav" aria-label="3D 測試模式">
    <ScopeLink className="loc-button" href={navigationHref('lrunes','',native)} native={native}>回符文首頁</ScopeLink>
    <ScopeLink className="loc-button" href={navigationHref('lrunes','card3d/duel',native)} native={native}>3D 抽牌</ScopeLink>
    <ScopeLink className="loc-button" href={navigationHref('lrunes','card3d/daily',native)} native={native}>3D 每日符文</ScopeLink>
    <ScopeLink className="loc-button" href={navigationHref('lrunes','card3d/list',native)} native={native}>3D 圖鑑</ScopeLink>
    <ScopeLink className="loc-button" href={navigationHref('lrunes','card',native)} native={native}>目前 2D 版本</ScopeLink>
  </nav>;
}
