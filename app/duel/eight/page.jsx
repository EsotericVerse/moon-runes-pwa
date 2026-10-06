import DuelDrawPage from '../DuelDrawPage';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'八卡抽籤｜月之符文',
  description:'以 3 / 2 / 3 結構抽取八張符文，前後各三張、中段兩張。',
  path:'/duel/eight/'
});

export default function DuelPage(){
  return <DuelDrawPage drawKey="8card"/>;
}
