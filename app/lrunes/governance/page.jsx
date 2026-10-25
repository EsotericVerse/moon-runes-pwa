import LocApp from '../../loc/LocApp';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'痕跡｜月之符文',
  description:'以地理位置展示空間定錨與路線。',
  path:'/governance/',
  robots:{index:false,follow:false}
});

export default function Page(){return <LocApp forcedView="trace" forcedScope="lrunes"/>;}
