import DuelDrawPage from '../DuelDrawPage';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'十卡抽籤｜月之符文',
  description:'以 4 / 2 / 4 語義結構抽取十張符文，畫面以五組雙卡排列。',
  path:'/duel/ten/'
});

export default function DuelPage(){
  return <DuelDrawPage drawKey="10card"/>;
}
