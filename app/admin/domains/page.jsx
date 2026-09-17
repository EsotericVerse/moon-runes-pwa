import RegistryTable from '../RegistryTable';
import registry from '../../../data/json/registries/LOC_DOMAIN_REGISTRY.json';

export const metadata={title:'Domains｜Admin',robots:{index:false,follow:false}};
export default function DomainRegistryPage(){return <main className="loc-view"><RegistryTable title="Domain Registry" description="Domain 優先，目錄其次，頁面最後。" columns={[{key:'scope',label:'Scope'},{key:'canonical_host',label:'Canonical Host'},{key:'domain_label',label:'Domain Label'},{key:'priority',label:'Priority'},{key:'fallback_routes',label:'Fallback'}]} rows={registry.scopes}/></main>;}
