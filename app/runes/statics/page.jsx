import StaticsView from '../../loc/views/StaticsView';

export const metadata={title:'符文統計｜LunaRunes 月之符文'};

export default function RunesStaticsPage(){
  return <main className="loc-next-main" data-scope="lunarunes" data-loc-view="statics"><StaticsView scope="lunarunes" /></main>;
}
