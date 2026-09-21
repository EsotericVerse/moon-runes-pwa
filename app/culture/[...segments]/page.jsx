import LocApp from '../../loc/LocApp';

export default function CultureSubroutePage({params}){
  const section=params?.segments?.join('/')||null;
  return <LocApp forcedView="culture" forcedSection={section}/>;
}
