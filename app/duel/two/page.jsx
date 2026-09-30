import DuelDrawPage from '../DuelDrawPage';

export const metadata = {
  title: '雙卡抽籤｜月之符文',
  description: '以兩枚符文組成因與果的閱讀結構，先看造成現況的來源，再看主要結果或落點。'
};

export default function DuelTwoPage() {
  return <DuelDrawPage drawKey="2card" />;
}
