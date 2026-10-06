import DuelDrawPage from '../DuelDrawPage';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'九卡抽籤｜月之符文',
  description:'以 3 / 3 / 3 結構抽取九張符文，三段各由三張符文構成。',
  path:'/duel/nine/'
});

export default function DuelPage(){
  return <DuelDrawPage drawKey="9card"/>;
}
