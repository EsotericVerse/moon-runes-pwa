import LocApp from '../../../loc/LocApp';
import {authorMetadata} from '../../../seo/metadata';

export const metadata=authorMetadata({
  title:'關鍵詞設定｜政德｜月典',
  description:'管理作者 Scope 的關鍵詞 Class、Group、Item 與分析設定。',
  path:'/lo3rwang/statics/keywords/'
});
export default function Page(){return <LocApp forcedView="keywords" forcedScope="lo3rwang"/>;}
