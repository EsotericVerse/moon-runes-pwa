import LocApp from '../../../loc/LocApp';
export function generateStaticParams(){return [{section:'literary'},{section:'novel'},{section:'music'},{section:'pics'},{section:'multimedia'}];}
export default function CultureGalaxySectionPage(){return <LocApp forcedView="culture"/>;}
