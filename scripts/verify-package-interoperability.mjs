import {readFileSync} from 'node:fs';

const failures=[];
const packageJson=JSON.parse(readFileSync('package.json','utf8'));
const deps=packageJson.dependencies||{};
const requiredPackages=['@neondatabase/neon-js','@neondatabase/serverless','@tanstack/react-query','flexsearch','recharts','vis-network','vis-timeline','zod'];
for(const name of requiredPackages)if(!deps[name])failures.push(`package.json: missing ${name}`);

function read(path){return readFileSync(path,'utf8');}
function requireText(path,patterns,description){
  const text=read(path);
  for(const pattern of patterns){
    if(!pattern.test(text))failures.push(`${description}: ${path} is missing ${pattern}`);
  }
}

// Neon repository + Zod define the read-only table boundary.
requireText('app/loc/neon-repository.js',[/from ['"]zod['"]/ ,/from ['"]\.\/neon-client['"]/ ,/export async function selectNeonRows/],'Neon repository/Zod boundary');
// TanStack Query is used by data-heavy features; statistics uses direct offset pagination.
requireText('app/modular-v2/features/ContextV2.jsx',[/from ['"]@tanstack\/react-query['"]/ ,/selectScopeContextData/],'Context Query/Neon interop');
requireText('app/modular-v2/features/StatisticsV2.jsx',[/useOffsetPagination/ ,/selectScopeRankingPage/ ,/from ['"]recharts['"]/],'Statistics offset/Neon/Recharts interop');
requireText('app/modular-v2/features/CultureV2.jsx',[/from ['"]@tanstack\/react-query['"]/ ,/selectScopeCultureData/ ,/CultureTimelineV2/],'Culture Query/Neon/Timeline interop');
requireText('app/modular-v2/ScopeManagementV2.jsx',[/from ['"]@tanstack\/react-query['"]/ ,/useNeonAccount/ ,/neon-scope-governance/],'Admin Query/Neon/Casbin boundary');
// Search is a paged Neon read indexed in FlexSearch; no JSON corpus is accepted.
requireText('app/loc/neon-search.js',[/from ['"]flexsearch['"]/ ,/from ['"]\.\/neon-repository['"]/ ,/selectAllNeonRows/ ,/new Index\(/],'FlexSearch/Neon interop');
// Graph and timeline packages are loaded only by their corresponding Neon feature modules.
requireText('app/modular-v2/modules/context-graph/ContextGraphV2.jsx',[/vis-network\/standalone/ ,/new Network/],'Neon context graph package boundary');
requireText('app/modular-v2/modules/culture-timeline/CultureTimelineV2.jsx',[/vis-timeline\/standalone/ ,/new Timeline/],'Neon culture timeline package boundary');

if(failures.length){
  console.error('[package-interoperability] violations:\n'+failures.map(item=>`- ${item}`).join('\n'));
  process.exit(1);
}
console.log('[package-interoperability] Neon, query, search, visualization and validation package boundaries verified');
