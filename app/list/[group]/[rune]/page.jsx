import {RuneDetailPage} from '../../../runes/RuneDirectoryPages';
import {runeParams} from '../../../runes/rune-directory.mjs';

export function generateStaticParams(){return runeParams();}

export async function generateMetadata({params}){
  const {group,rune}=await params;
  return {title:`符文 ${group}/${rune}｜月之符文`};
}

export default async function Page({params}){
  const {group,rune}=await params;
  return <RuneDetailPage groupId={group} runeId={rune}/>;
}
