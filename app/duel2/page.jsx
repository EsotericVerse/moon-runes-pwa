import RuneRitualLab from '../lrunes/duel2/RuneRitualLab';
import {lunarunesMetadata} from '../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'3D 符文召喚儀式｜月之符文測試',
  description:'月之符文逐張召喚與 3D 抽牌效果實驗，獨立於正式抽牌頁。',
  path:'/duel2/',
  noIndex:true
});
export default function Page(){return <RuneRitualLab/>;}
