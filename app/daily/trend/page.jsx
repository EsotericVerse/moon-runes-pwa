import DailyTrendClient from './DailyTrendClient';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'每日符文趨勢｜月之符文',
  description:'依一段時間內的每日抽籤紀錄，觀察符文出現密度與同一符文方向的變化。',
  path:'/daily/trend/'
});

export default function Page(){return <DailyTrendClient/>;}
