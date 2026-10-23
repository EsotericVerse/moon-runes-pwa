import LocApp from '../../loc/LocApp';
import {locMetadata} from '../../seo/metadata';

export const metadata=locMetadata({
  title:'來源管理｜LOC 月典',
  description:'管理 LOC 跨 Scope 統計來源分類。',
  path:'/culture/manage/',
  noIndex:true
});

export default function Page(){return <LocApp forcedView="sourceManage" forcedScope="loc"/>;}
