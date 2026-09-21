import LocApp from '../../loc/LocApp';

export function generateStaticParams(){return [{"segments":["keyword"]},{"segments":["units"]},{"segments":["sources"]}];}

export default async function StaticsSubroutePage({params}){
  const resolvedParams=await params;
  const section=resolvedParams?.segments?.join('/')||null;
  return <LocApp forcedView="statics" forcedSection={section}/>;
}
