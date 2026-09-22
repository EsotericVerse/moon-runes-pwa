import WritingDetailClient from '../WritingDetailClient';
import {WRITING_ROUTE_IDS} from '../../../js/writing.js';

export function generateStaticParams(){return WRITING_ROUTE_IDS.map(workId=>({workId}));}
export async function generateMetadata(){return{title:'文字創作｜LOC',description:'LOC4 文字創作由 Neon runtime projection 提供。'};}
export default function WritingDetailPage({params}){return <WritingDetailClient workId={params?.workId||''}/>;}
