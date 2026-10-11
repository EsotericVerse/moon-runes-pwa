import RuneRitualLab from '../../lrunes/duel2/RuneRitualLab';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'3D 符文隨機抽牌｜月之符文',
  description:'真實 3D 月光召喚場域，逐次隨機抽取符文並生成原有籤詩。',
  path:'/card/duel/',noIndex:true
});
export default function RuneCardDuel(){return <RuneRitualLab/>;}
