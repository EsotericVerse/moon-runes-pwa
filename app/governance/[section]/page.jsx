import LocApp from '../../loc/LocApp';
export function generateStaticParams(){return [{section:'law'},{section:'faq'},{section:'manage'}];}
export default async function GovernanceSectionPage({params}){const {section}=await params;return <LocApp forcedView="governance" forcedSection={section}/>;}
