import DailyTrendClient from '../../../daily/trend/DailyTrendClient';
export const metadata={title:'每日符文趨勢｜月之符文',description:'依一段時間內的每日抽籤紀錄，觀察符文出現密度與同一符文方向的變化。'};
export default function Page(){return <DailyTrendClient/>;}
