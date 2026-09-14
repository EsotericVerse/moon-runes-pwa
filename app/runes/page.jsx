import './rune-atlas-governance.css';
import RuneDrawClient from './RuneDrawClient';

export const metadata = {
  title: '月之符文｜LOC',
  description: '月之符文抽牌與語意指引。'
};

export default function RunesPage() {
  return <>
    <nav className="loc-card" aria-label="月之符文功能入口">
      <a href="/runes">抽牌</a> · <a href="/runes/list">所有符文列表</a> · <a href="/runes/history">抽籤紀錄</a>
    </nav>
    <RuneDrawClient/>
  </>;
}
