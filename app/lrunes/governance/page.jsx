import LocApp from '../../loc/LocApp';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'使用原則與著作權｜月之符文',
  description:'說明月之符文的使用原則、恆定符文、著作權與核心買斷原則。',
  path:'/governance/'
});

export default function Page(){return <LocApp forcedView="governance" forcedScope="lrunes"/>;}
