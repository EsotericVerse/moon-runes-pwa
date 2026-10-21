import RuneLegacyRedirect from '../../lrunes/RuneLegacyRedirect';
import {lunarunesMetadata} from '../../seo/metadata';
// /card/duel/ now defaults to 3D itself, so this legacy "3D-first compat"
// entry point needs no ?d= at all -- it just points at the real page.
export const metadata=lunarunesMetadata({
  title:'符文抽牌 · 已搬家｜月之符文',description:'此頁已整合至正式抽牌頁。',path:'/card3d/duel/',noIndex:true
});
export default function Page(){return <RuneLegacyRedirect target="/card/duel/" label="前往符文抽牌"/>;}
