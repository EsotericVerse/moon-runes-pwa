import RegistryTable from '../RegistryTable';
import registry from '../../../data/json/registries/LOC_SOURCE_REGISTRY.json';

export const metadata={title:'Sources｜Admin',robots:{index:false,follow:false}};
export default function SourceRegistryPage(){return <main className="loc-view"><RegistryTable title="Source Registry" description="來源、保留、同步與隱私狀態分離管理。" columns={[{key:'source_id',label:'Source ID'},{key:'scope',label:'Scope'},{key:'source_type',label:'Type'},{key:'label',label:'Label'},{key:'visibility',label:'Visibility'},{key:'retention',label:'Retention'},{key:'sync_state',label:'Sync'}]} rows={registry.records}/></main>;}
