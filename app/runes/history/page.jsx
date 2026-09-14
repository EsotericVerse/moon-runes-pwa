import '../rune-atlas-governance.css';
import RunesClient from '../RunesClient';

export const metadata = {
  title: '抽籤紀錄｜月之符文｜LOC',
  description: 'LunaRunes local draw history and record management.'
};

export default function RuneHistoryPage() {
  return <main>
    <p><a href="/runes">← 回月之符文抽牌</a></p>
    <RunesClient/>
  </main>;
}
