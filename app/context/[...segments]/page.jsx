import LocApp from '../../loc/LocApp';

export function generateStaticParams(){return [{"segments":["keywords"]}];}

export default function ContextSubroutePage({params}){
  const section=params?.segments?.join('/')||null;
  return <LocApp forcedView="context" forcedSection={section}/>;
}
