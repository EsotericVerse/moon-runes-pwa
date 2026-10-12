import Rune3DLibrary from '../../lrunes/Rune3DLibrary';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'符文顯現圖鑑｜月之符文',description:'以字型、符文字樣與適合的魔法顯現六十六枚符文。',path:'/card3d/list/',noIndex:true
});
export default function Page(){return <Rune3DLibrary/>;}
