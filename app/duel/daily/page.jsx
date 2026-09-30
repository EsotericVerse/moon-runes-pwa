import DuelDrawPage from '../DuelDrawPage';

export const metadata = {
  title: '每日符文｜月之符文',
  description: '每天抽取一枚符文作為當日回看與行動參考，並保留自己的判斷與選擇。'
};

export default function DuelDailyPage() {
  return <DuelDrawPage drawKey="daily" />;
}
