import RuneLegacyRedirect from '../../lrunes/RuneLegacyRedirect';
import {lunarunesMetadata} from '../../seo/metadata';
// This trial page (bare RuneRitualLab, no 2D/3D switcher) is retired in
// favor of the unified /card/duel/ entry, which renders the same component
// under its 2D option.
export const metadata=lunarunesMetadata({
  title:'符文抽牌 · 已搬家｜月之符文',description:'此頁已整合至正式抽牌頁。',path:'/card/duel2/',noIndex:true
});
export default function Page(){return <RuneLegacyRedirect target="/card/duel/?d=2d" label="前往符文抽牌"/>;}
