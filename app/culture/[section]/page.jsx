import LocApp from '../../loc/LocApp';
export function generateStaticParams(){return [{section:'trajectory'},{section:'history'},{section:'galaxy'}];}
export default function CultureSectionPage(){return <LocApp forcedView="culture"/>;}
