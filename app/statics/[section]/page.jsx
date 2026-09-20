import LocApp from '../../loc/LocApp';
export function generateStaticParams(){return [{section:'keyword'},{section:'source'},{section:'import'},{section:'total'}];}
export default async function StaticsSectionPage({params}){const {section}=await params;return <LocApp forcedView="statics" forcedSection={section}/>;}
