import RuneDaily3D from '../../lrunes/daily3d/RuneDaily3D';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'每日符文 · 月光美術｜月之符文',
  description:'以原創符文卡圖揭示今日符文、真實月相與五項每日指示。',
  path:'/card/daily/',noIndex:true
});
export default function RuneCardDaily(){return <RuneDaily3D/>;}
