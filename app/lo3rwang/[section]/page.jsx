import LocApp from '../../loc/LocApp';
export function generateStaticParams(){return [{section:'style'},{section:'work'},{section:'design'},{section:'galaxy'},{section:'others'},{section:'email'}];}
export default async function AuthorSectionPage({params}){const {section}=await params;return <LocApp forcedView="home" forcedSection={section}/>;}
