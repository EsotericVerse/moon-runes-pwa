import DuelDrawPage from '../DuelDrawPage';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'四卡抽籤｜月之符文',
  description:'以 1 / 2 / 1 結構抽取四張符文，中段使用兩張變數形成籤詩。',
  path:'/duel/four/'
});

export default function DuelPage(){
  return <DuelDrawPage drawKey="4card"/>;
}
