import RuneLegacyRedirect from '../../lrunes/RuneLegacyRedirect';
import {lunarunesMetadata} from '../../seo/metadata';
export const metadata=lunarunesMetadata({
  title:'每日符文 · 已搬家｜月之符文',description:'此頁已整合至正式每日符文頁。',path:'/card3d/daily/',noIndex:true
});
export default function Page(){return <RuneLegacyRedirect target="/card/daily/" label="前往每日符文"/>;}
