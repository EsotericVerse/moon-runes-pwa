import LocApp from '../../../loc/LocApp';
export function generateStaticParams(){return [{section:'keyword',kind:'total'},{section:'music',kind:'total'},{section:'source',kind:'total'}];}
export default async function StaticsSectionKindPage({params}){const {section,kind}=await params;return <LocApp forcedView="statics" forcedSection={`${section}/${kind}`}/>;}
