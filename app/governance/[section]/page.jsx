import LocApp from '../../loc/LocApp';
export function generateStaticParams(){return [{section:'law'},{section:'faq'},{section:'manage'}];}
export default function GovernanceSectionPage(){return <LocApp forcedView="governance"/>;}
