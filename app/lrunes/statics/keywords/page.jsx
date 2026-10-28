import LocApp from '../../../loc/LocApp';
import {lunarunesMetadata} from '../../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'關鍵詞設定｜月之符文',
  description:'管理月之符文 Scope 的關鍵詞 Class、Group、Item 與分析設定。',
  path:'/statics/keywords/',
  noIndex:true
});
export default function Page(){return <LocApp forcedView="keywords" forcedScope="lrunes"/>;}
