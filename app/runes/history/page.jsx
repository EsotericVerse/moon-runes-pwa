import '../rune-atlas-governance.css';
import HistoryClient from './HistoryClient';

export const metadata = {
  title: '抽籤紀錄｜月之符文｜LOC',
  description: '月之符文一般抽牌與每日抽牌的本機紀錄。'
};

export default function RuneHistoryPage() {
  return <main className="loc-next-main">
    <HistoryClient/>
  </main>;
}
