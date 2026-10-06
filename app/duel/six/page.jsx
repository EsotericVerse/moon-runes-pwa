import DuelDrawPage from '../DuelDrawPage';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'六卡抽籤｜月之符文',
  description:'以 2 / 2 / 2 結構抽取六張符文，前段、變數、後段各兩張。',
  path:'/duel/six/'
});

export default function DuelPage(){
  return <DuelDrawPage drawKey="6card"/>;
}
