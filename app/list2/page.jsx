import RuneAtlasLab from '../lrunes/list2/RuneAtlasLab';
import {lunarunesMetadata} from '../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'3D 符文圖鑑｜月之符文測試',
  description:'月之符文 66 枚 3D 文字圖鑑，每頁八枚、獨立於正式圖鑑。',
  path:'/list2/',
  noIndex:true
});
export default function Page(){return <RuneAtlasLab/>;}
