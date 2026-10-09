import DuelDrawPage from '../DuelDrawPage';
import {lunarunesPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/duel/ow3gs/'
});
}

export default function DuelPage(){
  return <DuelDrawPage drawKey="ow3gs"/>;
}
