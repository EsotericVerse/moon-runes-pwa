import DailyLogClient from './DailyLogClient';
import {lunarunesPageCopyMetadata} from '../../seo/metadata';

export async function generateMetadata(){
  return lunarunesPageCopyMetadata({  path:'/daily/log/'
});
}

export default function Page(){return <DailyLogClient/>;}
