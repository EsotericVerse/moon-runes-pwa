import DailyTrendClient from './DailyTrendClient';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'每日符文趨勢｜月之符文',
  description:'比較今日抽到的符文與上一筆相同符文，顯示前次日期、方向與兩次真實月相下的狀況形容。',
  path:'/daily/trend/'
});

export default function Page(){return <DailyTrendClient/>;}
