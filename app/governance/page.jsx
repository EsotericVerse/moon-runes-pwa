import LocApp from '../loc/LocApp';
import {locMetadata} from '../seo/metadata';

export const metadata=locMetadata({
  title:'痕跡｜LOC 月典',
  description:'在真實地圖中查看空間定錨與路線展示。',
  path:'/governance/',
  robots:{index:false,follow:false}
});

export default function GovernancePage(){return <LocApp forcedView="trace"/>;}
