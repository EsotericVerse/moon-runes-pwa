import RegistryTable from '../RegistryTable';
import registry from '../../../data/json/registries/LOC_AUDIT_REGISTRY.json';

export const metadata={title:'Audit｜Admin',robots:{index:false,follow:false}};
export default function AuditRegistryPage(){return <main className="loc-view"><RegistryTable title="Audit Registry" description="全站變更、覆寫、凍結、回滾與 supersede 的管理紀錄。" columns={[{key:'event_id',label:'Event'},{key:'scope',label:'Scope'},{key:'entity_type',label:'Entity Type'},{key:'entity_id',label:'Entity'},{key:'action',label:'Action'},{key:'actor_id',label:'Actor'},{key:'occurred_at',label:'Time'}]} rows={registry.records}/></main>;}
