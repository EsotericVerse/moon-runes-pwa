import RuneAtlasLab from '../../lrunes/list2/RuneAtlasLab';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'符文原創畫作圖鑑｜月之符文測試',
  description:'以原創九群組畫作與符文卡面建構新視覺圖鑑，獨立於正式圖鑑。',
  path:'/card/list2/',
  noIndex:true
});
export default function Page(){return <RuneAtlasLab/>;}
