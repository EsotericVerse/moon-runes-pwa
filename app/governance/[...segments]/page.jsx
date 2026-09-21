import LocApp from '../../loc/LocApp';

export function generateStaticParams(){return [{"segments":["law"]},{"segments":["faq"]},{"segments":["manage"]}];}

export default function GovernanceSubroutePage({params}){
  const section=params?.segments?.join('/')||null;
  return <LocApp forcedView="governance" forcedSection={section}/>;
}
