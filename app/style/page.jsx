import MyStyleView from '../loc/views/MyStyleView';

export const metadata={
  title:'個人風格｜LOC 月典',
  description:'個人風格設定與統計。'
};

export default function StylePage(){return <main className="loc-next-main"><MyStyleView/></main>;}
