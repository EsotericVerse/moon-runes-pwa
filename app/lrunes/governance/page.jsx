import LocApp from '../../loc/LocApp';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'使用原則與著作權｜月之符文',
  description:'說明月之符文的使用原則、正式定義、著作權與授權方式。',
  path:'/governance/'
});

export default function Page(){return <LocApp forcedView="governance"/>;}
