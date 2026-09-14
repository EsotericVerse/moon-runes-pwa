import LocApp from '../loc/LocApp';
import GovernanceManagement from '../loc/GovernanceManagement';

export const metadata={title:'治理｜LOC 月典'};

export default function GovernancePage(){
  return <>
    <LocApp/>
    <div className="loc-view">
      <div className="loc-grid two">
        <GovernanceManagement/>
      </div>
    </div>
  </>;
}
