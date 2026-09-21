import LocApp from '../../loc/LocApp';

export function generateStaticParams(){return [{"segments":["keyword"]},{"segments":["units"]},{"segments":["sources"]}];}

export default function StaticsSubroutePage({params}){
  const section=params?.segments?.join('/')||null;
  return <LocApp forcedView="statics" forcedSection={section}/>;
}
