import LocApp from '../../loc/LocApp';

export default function StaticsSubroutePage({params}){
  const section=params?.segments?.join('/')||null;
  return <LocApp forcedView="statics" forcedSection={section}/>;
}
