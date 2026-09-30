import DuelDrawPage from '../DuelDrawPage';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'每日符文｜月之符文',
  description:'每天抽取一枚符文作為當日回看與行動參考，並保留自己的判斷與選擇。',
  path:'/duel/daily/'
});

export default function DuelPage(){
  return <DuelDrawPage drawKey="daily"/>;
}
