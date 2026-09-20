import LocApp from '../../loc/LocApp';
export function generateStaticParams(){return [{section:'trajectory'},{section:'history'},{section:'galaxy'}];}
export default function CultureSectionPage({params}){return <LocApp forcedView="culture" forcedSection={params.section}/>;}
