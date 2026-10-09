import DuelDrawPage from '../DuelDrawPage';
import {lunarunesPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/duel/six/'
});
}

export default function DuelPage(){
  return <DuelDrawPage drawKey="6card"/>;
}
