import DuelDrawPage from '../DuelDrawPage';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'三卡抽籤｜月之符文',
  description:'以源、轉、合三個位置閱讀事情的起點、變化與整合結果。',
  path:'/duel/three/'
});

export default function DuelPage(){
  return <DuelDrawPage drawKey="3card"/>;
}
