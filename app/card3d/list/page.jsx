import Rune3DPreview from '../../lrunes/Rune3DPreview';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'3D 符文圖鑑測試｜月之符文',description:'獨立測試符文群組與立體字形，不更動 2D 圖鑑。',path:'/card3d/list/',noIndex:true
});
export default function Page(){return <Rune3DPreview mode="list"/>;}
