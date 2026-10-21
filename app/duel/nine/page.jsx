import RuneLegacyRedirect from '../../lrunes/RuneLegacyRedirect';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'符文抽牌 · 九張 · 已搬家｜月之符文',description:'此頁已整合至正式抽牌頁。',path:'/duel/nine/',noIndex:true
});
export default function Page(){return <RuneLegacyRedirect target="/card/duel/?d=old&spread=9card" label="前往符文抽牌"/>;}
