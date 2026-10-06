import DuelDrawPage from '../DuelDrawPage';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'七卡抽籤｜月之符文',
  description:'以 2 / 3 / 2 結構抽取七張符文，中段以三張變數展開。',
  path:'/duel/seven/'
});

export default function DuelPage(){
  return <DuelDrawPage drawKey="7card"/>;
}
