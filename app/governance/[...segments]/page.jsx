import LocApp from '../../loc/LocApp';

export default function GovernanceSubroutePage({params}){
  const section=params?.segments?.join('/')||null;
  return <LocApp forcedView="governance" forcedSection={section}/>;
}
