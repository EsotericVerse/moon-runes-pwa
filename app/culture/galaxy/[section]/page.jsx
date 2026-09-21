import LocApp from '../../../loc/LocApp';
export function generateStaticParams(){return [{section:'literary'},{section:'novel'},{section:'music'},{section:'pics'},{section:'multimedia'}];}
export default async function CultureGalaxySectionPage({params}){const {section}=await params;return <LocApp forcedView="culture" forcedSection={`galaxy/${section}`}/>;}
