import RuneRitualLab from '../../lrunes/duel2/RuneRitualLab';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'符文月光召喚儀式｜月之符文測試',
  description:'以符韻原創畫作逐枚召喚與揭牌，獨立於原有正式抽牌頁。',
  path:'/card/duel2/',
  noIndex:true
});
export default function Page(){return <RuneRitualLab/>;}
