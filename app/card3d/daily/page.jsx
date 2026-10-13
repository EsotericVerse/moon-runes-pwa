import RuneUnifiedView from '../../lrunes/RuneUnifiedView';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'每日符文 · 3D 相容入口｜月之符文',description:'既有 3D 每日符文連結仍可使用，並可切回原創美術 2D 模式。',path:'/card3d/daily/',noIndex:true
});
export default function Page(){return <RuneUnifiedView feature="daily" defaultView="3d"/>;}
