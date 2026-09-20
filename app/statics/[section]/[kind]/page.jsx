import LocApp from '../../../loc/LocApp';
export function generateStaticParams(){return [{section:'keyword',kind:'total'},{section:'music',kind:'total'},{section:'source',kind:'total'}];}
export default function StaticsSectionKindPage({params}){return <LocApp forcedView="statics" forcedSection={`${params.section}/${params.kind}`}/>;}
