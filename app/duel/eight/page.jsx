import DuelDrawPage from '../DuelDrawPage';
import {lunarunesPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/duel/eight/'
});
}

export default function DuelPage(){
  return <DuelDrawPage drawKey="8card"/>;
}
