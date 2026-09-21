import LocApp from '../../loc/LocApp';
export function generateStaticParams(){return [{section:'graph'},{section:'node'},{section:'edge'},{section:'scenarios'},{section:'trend'},{section:'dailtrunes'}];}
export default function ContextSectionPage({params}){return <LocApp forcedView="context" forcedSection={params.section}/>;}
