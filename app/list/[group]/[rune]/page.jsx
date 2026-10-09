import {RuneDetailPage} from '../../../lrunes/RuneDirectoryPages';
import {runeParams} from '../../../lrunes/rune-directory.mjs';
import {lunarunesPageCopyMetadata} from '../../../seo/metadata';

export function generateStaticParams(){return runeParams();}

export async function generateMetadata({params}){
  const {group,rune}=await params;
  return lunarunesPageCopyMetadata({
    path:`/list/${group}/${rune}/`
  });
}

export default async function Page({params}){
  const {group,rune}=await params;
  return <RuneDetailPage groupId={group} runeId={rune}/>;
}
