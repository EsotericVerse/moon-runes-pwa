import DuelDrawPage from '../DuelDrawPage';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'十一卡抽籤｜月之符文',
  description:'十一卡抽籤分成前因描述與核心判定兩層，依固定卡位整理較完整的脈絡與結果。',
  path:'/duel/ow3gs/'
});

export default function DuelPage(){
  return <DuelDrawPage drawKey="ow3gs"/>;
}
