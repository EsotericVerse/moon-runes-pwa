import RuneAtlasLab from '../../lrunes/list2/RuneAtlasLab';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'符文原創美術圖鑑｜月之符文',
  description:'以九大群組原創畫作與 66 張卡面展示原有符文圖鑑資訊。',
  path:'/card/list/',noIndex:true
});
export default function RuneCardList(){return <RuneAtlasLab/>;}
