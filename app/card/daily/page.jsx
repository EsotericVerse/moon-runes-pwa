import RuneDaily3D from '../../lrunes/daily3d/RuneDaily3D';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'3D 每日符文｜月之符文',
  description:'真實 3D 每日符文、即時月相與五項每日指示。',
  path:'/card/daily/',noIndex:true
});
export default function RuneCardDaily(){return <RuneDaily3D/>;}
