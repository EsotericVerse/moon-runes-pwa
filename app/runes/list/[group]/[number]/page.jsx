import RuneCardPageClient from './RuneCardPageClient';

export const dynamicParams=false;

export function generateStaticParams(){
  return Array.from({length:66},(_,index)=>{
    const number=index+1;
    const group=number<=64?Math.ceil(number/8):9;
    return {group:String(group).padStart(2,'0'),number:String(number).padStart(2,'0')};
  });
}

export const metadata={title:'符文｜月之符文'};

export default function RuneCardPage({params}){
  return <main className="loc-next-main"><RuneCardPageClient group={params.group} number={params.number}/></main>;
}
