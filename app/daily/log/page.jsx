import DailyLogClient from './DailyLogClient';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'每日符文紀錄｜月之符文',
  description:'依日期保存與回看每日符文抽籤結果，包括符文、方向與相關紀錄。',
  path:'/daily/log/'
});

export default function Page(){return <DailyLogClient/>;}
