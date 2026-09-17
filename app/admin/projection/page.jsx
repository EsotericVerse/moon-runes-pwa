import RegistryTable from '../RegistryTable';
import registry from '../../../data/json/registries/LOC_PROJECTION_REGISTRY.json';

export const metadata={title:'Projection｜Admin',robots:{index:false,follow:false}};
export default function ProjectionRegistryPage(){return <main className="loc-view"><RegistryTable title="Projection Registry" description="公開層級與搜尋、統計、語意、排行、趨勢投影分離控制。" columns={[{key:'entity_id',label:'Entity'},{key:'visibility',label:'Visibility'},{key:'projection_level',label:'Projection'},{key:'search_indexed',label:'Search'},{key:'statistics_included',label:'Stats'},{key:'semantic_scan_included',label:'Semantic'},{key:'ranking_included',label:'Ranking'},{key:'trend_included',label:'Trend'}]} rows={registry.records}/></main>;}
