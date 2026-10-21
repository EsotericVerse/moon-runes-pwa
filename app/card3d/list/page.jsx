import RuneLegacyRedirect from '../../lrunes/RuneLegacyRedirect';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'符文圖鑑 · 已搬家｜月之符文',description:'此頁已整合至正式符文圖鑑頁。',path:'/card3d/list/',noIndex:true
});
export default function Page(){return <RuneLegacyRedirect target="/card/list/" label="前往符文圖鑑"/>;}
