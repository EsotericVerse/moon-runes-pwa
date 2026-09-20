import LocApp from '../../loc/LocApp';
export function generateStaticParams(){return [{section:'style'},{section:'work'},{section:'design'},{section:'galaxy'},{section:'others'},{section:'email'}];}
export default function AuthorSectionPage(){return <LocApp forcedView="home"/>;}
