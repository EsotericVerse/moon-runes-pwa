import DuelDrawPage from '../DuelDrawPage';
import {lunarunesPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/duel/four/'
});
}

export default function DuelPage(){
  return <DuelDrawPage drawKey="4card"/>;
}
