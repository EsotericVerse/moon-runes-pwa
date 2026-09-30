import DuelDrawPage from '../DuelDrawPage';

export const metadata = {
  title: '單卡抽籤｜月之符文',
  description: '抽取一枚符文與一個方向，用來閱讀當下最核心的語意、狀態與單卡籤詩。'
};

export default function DuelOnePage() {
  return <DuelDrawPage drawKey="single" />;
}
