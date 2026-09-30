import DuelDrawPage from '../DuelDrawPage';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'雙卡抽籤｜月之符文',
  description:'以兩枚符文組成因與果的閱讀結構，先看造成現況的來源，再看主要結果或落點。',
  path:'/duel/two/'
});

export default function DuelPage(){
  return <DuelDrawPage drawKey="2card"/>;
}
