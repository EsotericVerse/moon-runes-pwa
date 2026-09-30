import DuelDrawPage from '../DuelDrawPage';

export const metadata = {
  title: '五卡抽籤｜月之符文',
  description: '以兩張成因、一張意外變化與兩張現在狀況，組成五卡的完整籤詩結構。'
};

export default function DuelFivePage() {
  return <DuelDrawPage drawKey="5card" />;
}
