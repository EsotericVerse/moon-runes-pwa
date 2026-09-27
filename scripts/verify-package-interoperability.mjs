import {readFileSync} from 'node:fs';

const failures=[];
const packageJson=JSON.parse(readFileSync('package.json','utf8'));
const deps=packageJson.dependencies||{};
const requiredPackages=['@neondatabase/neon-js','@tanstack/react-query','flexsearch','recharts','vis-network','vis-timeline','zod','p-map'];
for(const name of requiredPackages)if(!deps[name])failures.push(`package.json: missing ${name}`);

function read(path){return readFileSync(path,'utf8');}
function requireText(path,patterns,description){
  const text=read(path);
  for(const pattern of patterns){
    if(!pattern.test(text))failures.push(`${description}: ${path} is missing ${pattern}`);
  }
}

// Public canonical reads use Neon-managed anonymous JWT transport; management sign-in upgrades the same client.
requireText('app/loc/neon-client.js',[/createClient/ ,/allowAnonymous\\s*:\\s*true/ ,/neonPublicClient=neonClient/ ,/neonAuthClient=neonClient/],'Neon managed-anonymous/auth client boundary');
requireText('app/loc/neon-repository.js',[/from ['"]zod['"]/ ,/neonPublicClient/ ,/neonAuthClient/ ,/export async function selectNeonRows/],'Neon repository/Zod boundary');
// TanStack Query is used by data-heavy features; statistics uses direct offset pagination.
requireText('app/modular-v2/features/ContextV2.jsx',[/from ['"]@tanstack\/react-query['"]/ ,/selectScopeContextData/],'Context Query/Neon interop');
requireText('app/modular-v2/features/StatisticsV2.jsx',[/useOffsetPagination/ ,/selectScopeRankingPage/ ,/from ['"]recharts['"]/],'Statistics offset/Neon/Recharts interop');
requireText('app/modular-v2/features/CultureV2.jsx',[/from ['"]@tanstack\/react-query['"]/ ,/selectScopeCultureData/ ,/CultureTimelineV2/],'Culture Query/Neon/Timeline interop');
requireText('app/modular-v2/ScopeManagementV2.jsx',[/from ['"]@tanstack\/react-query['"]/ ,/useNeonAccount/ ,/neon-scope-governance/],'Admin Query/Neon Auth boundary');
// FlexSearch is the shared text engine. Neon remains SSOT and adaptive IO supplies index batches.
requireText('app/loc/text-engine.mjs',[/from ['"]flexsearch['"]/ ,/new Index/ ,/new Resolver/ ,/Charset\.CJK/],'Shared FlexSearch text engine');
requireText('app/loc/search-providers.js',[/getRuntimeTextIndex/ ,/searchTextIndex/ ,/processNeonHeavyRows/],'Search/FlexSearch adaptive IO boundary');
requireText('app/loc/style-classifier.js',[/createTextIndex/ ,/searchTextIndex/ ,/splitRuneKeywordEntries/],'Culture/Statistics FlexSearch classifier boundary');
// Graph and timeline packages are loaded only by their corresponding Neon feature modules.
requireText('app/modular-v2/modules/context-graph/ContextGraphV2.jsx',[/vis-network\/standalone/ ,/new Network/],'Neon context graph package boundary');
requireText('app/modular-v2/modules/culture-timeline/CultureTimelineV2.jsx',[/vis-timeline\/standalone/ ,/new Timeline/],'Neon culture timeline package boundary');

if(failures.length){
  console.error('[package-interoperability] violations:\n'+failures.map(item=>`- ${item}`).join('\n'));
  process.exit(1);
}
console.log('[package-interoperability] Neon SSOT, FlexSearch text engine, query, visualization, IO and validation package boundaries verified');
