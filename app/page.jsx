import LocApp from './loc/LocApp';

export const metadata = {
  title: 'LOC 月典',
  description: '月典是一套語言建構框架工具，用來整理文字、作品與時間脈絡，並透過搜尋、統計與時間變化協助回看資料。'
};

export default function HomePage() {
  return <LocApp />;
}
