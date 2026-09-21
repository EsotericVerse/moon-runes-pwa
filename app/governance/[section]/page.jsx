import LocApp from '../../loc/LocApp';
export function generateStaticParams(){return [{section:'law'},{section:'faq'},{section:'manage'}];}
export default function GovernanceSectionPage({params}){return <LocApp forcedView="governance" forcedSection={params.section}/>;}
