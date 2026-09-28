import {readFileSync} from 'node:fs';

const failures=[];
const packageJson=JSON.parse(readFileSync('package.json','utf8'));
const deps=packageJson.dependencies||{};
const requiredPackages=['@neondatabase/neon-js','@tanstack/react-query','flexsearch','recharts','vis-network','vis-timeline','zod'];
for(const name of requiredPackages)if(!deps[name])failures.push(`package.json: missing ${name}`);

function read(path){return readFileSync(path,'utf8');}
function requireText(path,patterns,description){
  const text=read(path);
  for(const pattern of patterns){
    if(!pattern.test(text))failures.push(`${description}: ${path} is missing ${pattern}`);
  }
}

// Public canonical reads use an isolated anonymous-token provider; management keeps its own authenticated client.
requireText('app/loc/neon-client.js',[/createClient/ ,/getNeonPublicToken/ ,/resetNeonPublicToken/ ,/getToken:getNeonPublicToken/ ,/neonAuthClient=createClient/],'Neon isolated public-token/auth client boundary');
// TanStack Query is used by data-heavy Current features.
requireText('app/modular-v2/features/KeywordSettingsV2.jsx',[/from ['"]@tanstack\/react-query['"]/ ,/selectRuneKeywordCatalog/],'Keyword settings Query/rune repository interop');
requireText('app/modular-v2/features/StatisticsV2.jsx',[/from ['\"]@tanstack\\/react-query['\"]/ ,/selectScopeRankingAll/ ,/IncrementalLoadV2/ ,/from ['\"]recharts['\"]/],'Statistics Query/Neon/Recharts interop');
requireText('app/modular-v2/features/CultureV2.jsx',[/from ['"]@tanstack\/react-query['"]/ ,/selectScopeCultureData/ ,/CultureTimelineV2/],'Culture Query/Neon/Timeline interop');
requireText('app/loc/GovernanceManagement.jsx',[/from ['"]react-select['"]/ ,/useNeonAccount/ ,/StyleKeywordSettingsV2/ ,/CultureTimelineEditor/],'Scope management React Select/Neon Auth boundary');
requireText('app/loc/views/AdminHomeView.jsx',[/from ['"]react-select['"]/ ,/useNeonAccount/ ,/canManageGlobalSync/],'Admin React Select/Neon Auth boundary');
// FlexSearch is the shared text engine. Neon remains SSOT and adaptive IO supplies index batches.
requireText('app/loc/text-engine.mjs',[/from ['"]flexsearch['"]/ ,/new Index/ ,/new Resolver/ ,/Charset\.CJK/],'Shared FlexSearch text engine');
requireText('app/loc/search-providers.js',[/getRuntimeTextIndex/ ,/searchTextIndex/ ,/neonPublicClient/],'Search/FlexSearch Neon client boundary');
requireText('app/loc/style-classifier.js',[/createTextIndex/ ,/searchTextIndex/ ,/splitRuneKeywordEntries/],'Culture/Statistics FlexSearch classifier boundary');
// Graph and timeline packages are loaded only by their corresponding Neon feature modules.
requireText('app/modular-v2/modules/keyword-graph/KeywordGraph2DV2.jsx',[/vis-network\/standalone/ ,/new Network/],'Keyword graph vis-network package boundary');
requireText('app/modular-v2/modules/culture-timeline/CultureTimelineV2.jsx',[/vis-timeline\/standalone/ ,/new Timeline/],'Neon culture timeline package boundary');

if(failures.length){
  console.error('[package-interoperability] violations:\n'+failures.map(item=>`- ${item}`).join('\n'));
  process.exit(1);
}
console.log('[package-interoperability] Neon SSOT, FlexSearch text engine, query and visualization package boundaries verified');
