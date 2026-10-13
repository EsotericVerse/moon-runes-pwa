import RuneUnifiedView from '../../lrunes/RuneUnifiedView';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'符文圖鑑 · 3D 相容入口｜月之符文',description:'既有 3D 圖鑑連結仍可使用，並可在同一頁切換 2D 原創符文卡圖。',path:'/card3d/list/'
});
export default function Page(){return <RuneUnifiedView feature="list" defaultView="3d"/>;}
