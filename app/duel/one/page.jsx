import DuelDrawPage from '../DuelDrawPage';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'單卡抽籤｜月之符文',
  description:'抽取一枚符文與一個方向，用來閱讀當下最核心的語意、狀態與單卡籤詩。',
  path:'/duel/one/'
});

export default function DuelPage(){
  return <DuelDrawPage drawKey="single"/>;
}
