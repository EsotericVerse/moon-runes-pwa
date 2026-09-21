import LocApp from '../../loc/LocApp';

export function generateStaticParams(){return [{"segments":["trajectory"]},{"segments":["history"]},{"segments":["galaxy"]}];}

export default function CultureSubroutePage({params}){
  const section=params?.segments?.join('/')||null;
  return <LocApp forcedView="culture" forcedSection={section}/>;
}
