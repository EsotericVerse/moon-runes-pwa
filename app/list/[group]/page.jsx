import {RuneGroupPage} from '../../lrunes/RuneDirectoryPages';
import {groupParams} from '../../lrunes/rune-directory.mjs';

export function generateStaticParams(){return groupParams();}

export async function generateMetadata({params}){
  const {group}=await params;
  return {title:`符文群組 ${group}｜月之符文`};
}

export default async function Page({params}){
  const {group}=await params;
  return <RuneGroupPage groupId={group}/>;
}
