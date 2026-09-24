import DailyTrendClient from '../../../daily/trend/DailyTrendClient';

export const metadata={title:'每日符文分析趨勢｜月之符文'};

export default function LunaRuneDailyTrendPage(){
  return <main className="loc-next-main"><DailyTrendClient/></main>;
}
