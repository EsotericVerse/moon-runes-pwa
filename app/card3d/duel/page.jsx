import RuneUnifiedView from '../../lrunes/RuneUnifiedView';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'符文抽牌 · 3D 相容入口｜月之符文',description:'既有 3D 連結繼續可用，與正式抽牌頁共用 2D／3D 切換介面。',path:'/card3d/duel/',noIndex:true
});
export default function Page(){return <RuneUnifiedView feature="duel" defaultView="3d"/>;}
