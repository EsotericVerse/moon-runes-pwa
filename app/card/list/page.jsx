import RuneAtlasLab from '../../lrunes/list2/RuneAtlasLab';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'3D 符文指定圖鑑｜月之符文',
  description:'真實 3D 恆動九群組星域，指定符文並展示原有圖鑑資訊。',
  path:'/card/list/',noIndex:true
});
export default function RuneCardList(){return <RuneAtlasLab/>;}
