import LocApp from '../../loc/LocApp';
export function generateStaticParams(){return [{section:'keyword'},{section:'source'},{section:'import'},{section:'total'}];}
export default function StaticsSectionPage({params}){return <LocApp forcedView="statics" forcedSection={params.section}/>;}
