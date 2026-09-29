import {readFileSync} from 'node:fs';

const failures=[];
const packageJson=JSON.parse(readFileSync('package.json','utf8'));
const deps=packageJson.dependencies||{};
const requiredPackages=['@neondatabase/neon-js','@tanstack/react-query','recharts','vis-network','vis-timeline','react-select','zod'];
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
requireText('app/modular-v2/features/KeywordSettingsV2.jsx',[/from ['\"]@tanstack\\/react-query['\"]/ ,/selectRuneKeywordGroups/],'Keyword settings Query/rune repository interop');
requireText('app/modular-v2/features/StatisticsV2.jsx',[/from ['\"]@tanstack\\/react-query['\"]/ ,/selectScopeRankingRows/ ,/from ['\"]recharts['\"]/],'Statistics Query/Neon/Recharts interop');
requireText('app/modular-v2/features/CultureV2.jsx',[/from ['"]@tanstack\/react-query['"]/ ,/selectScopeCultureData/ ,/CultureTimelineV2/],'Culture Query/Neon/Timeline interop');
requireText('app/loc/GovernanceManagement.jsx',[/from ['"]react-select['"]/ ,/useNeonAccount/ ,/StyleKeywordSettingsV2/ ,/CultureTimelineEditor/],'Scope management React Select/Neon Auth boundary');
requireText('app/loc/views/AdminHomeView.jsx',[/from ['"]react-select['"]/ ,/useNeonAccount/ ,/canManageGlobalSync/],'Admin React Select/Neon Auth boundary');
// Search filtering is executed by Neon/PostgREST; the browser receives only matched rows.
requireText('app/loc/search-providers.js',[/count:'exact',head:true/ ,/\.or\(/ ,/\.range\(/ ,/outputColumns\.join/],'Search direct Neon literal-query boundary');
// Graph and timeline packages are loaded only by their corresponding Neon feature modules.
requireText('app/modular-v2/modules/culture-timeline/CultureTimelineV2.jsx',[/vis-timeline\/standalone/ ,/new Timeline/],'Neon culture timeline package boundary');

if(failures.length){
  console.error('[package-interoperability] violations:\n'+failures.map(item=>`- ${item}`).join('\n'));
  process.exit(1);
}
console.log('[package-interoperability] Neon SSOT, direct query and visualization package boundaries verified');

