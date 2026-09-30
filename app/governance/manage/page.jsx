import LocApp from '../../loc/LocApp';
import {locMetadata} from '../../seo/metadata';

export const metadata=locMetadata({
  title:'管理｜LOC 月典',
  description:'LOC 月典的治理與系統管理入口。',
  path:'/governance/manage/',
  noIndex:true
});

export default function Page(){return <LocApp forcedView="manage" forcedScope="loc"/>;}
