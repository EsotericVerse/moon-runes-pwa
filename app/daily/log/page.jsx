import HistoryClient from '../../runes/history/HistoryClient';

export const metadata={title:'每日符文｜月之符文'};

export default function DailyRuneLogPage(){
  return <main className="loc-next-main"><HistoryClient defaultKind="daily"/></main>;
}
