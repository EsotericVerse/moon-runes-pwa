import RegistryTable from '../RegistryTable';
import contentRegistry from '../../../data/json/registries/LOC_CONTENT_REGISTRY.json';
import actorRegistry from '../../../data/json/registries/LOC_ACTOR_REGISTRY.json';

export const metadata={title:'Content & Authorship｜Admin',robots:{index:false,follow:false}};
export default function ContentRegistryPage(){return <main className="loc-view">
  <RegistryTable title="Content Registry" description="作者、貢獻者、來源、發行者與治理者分離。" columns={[{key:'content_id',label:'Content ID'},{key:'scope',label:'Scope'},{key:'content_type',label:'Type'},{key:'title',label:'Title'},{key:'author_actor_ids',label:'Authors'},{key:'source_ids',label:'Sources'},{key:'visibility',label:'Visibility'}]} rows={contentRegistry.records}/>
  <RegistryTable title="Actor Registry" description="平台治理角色不自動等於內容作者。" columns={[{key:'actor_id',label:'Actor ID'},{key:'display_name',label:'Name'},{key:'actor_type',label:'Type'},{key:'roles',label:'Roles'}]} rows={actorRegistry.records}/>
</main>;}
