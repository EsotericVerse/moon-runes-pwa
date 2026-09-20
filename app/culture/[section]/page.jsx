import LocApp from '../../loc/LocApp';
export function generateStaticParams(){return [{section:'trajectory'},{section:'history'},{section:'galaxy'}];}
export default async function CultureSectionPage({params}){const {section}=await params;return <LocApp forcedView="culture" forcedSection={section}/>;}
