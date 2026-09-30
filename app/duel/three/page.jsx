import DuelDrawPage from '../DuelDrawPage';

export const metadata = {
  title: '三卡抽籤｜月之符文',
  description: '以源、轉、合三個位置閱讀事情的起點、變化與整合結果。'
};

export default function DuelThreePage() {
  return <DuelDrawPage drawKey="3card" />;
}
