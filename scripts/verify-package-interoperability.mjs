import {readFileSync} from 'node:fs';

const failures=[];
const packageJson=JSON.parse(readFileSync('package.json','utf8'));
const deps=packageJson.dependencies||{};
const devDeps=packageJson.devDependencies||{};

const requiredRuntimePackages=[
  '@neondatabase/neon-js',
  '@tanstack/react-query',
  'flexsearch',
  'karaul',
  'motion',
  'next',
  'react',
  'react-dom',
  'react-select',
  'recharts',
  'vis-network',
  'vis-timeline',
  'zod'
];
const requiredDevPackages=['@axe-core/playwright','@playwright/test'];

for(const name of requiredRuntimePackages)if(!deps[name])failures.push('package.json: missing Current runtime dependency '+name);
for(const name of requiredDevPackages)if(!devDeps[name])failures.push('package.json: missing Current dev dependency '+name);

function read(path){return readFileSync(path,'utf8');}
function requireText(path,patterns,description){
  const text=read(path);
  for(const pattern of patterns)if(!pattern.test(text))failures.push(description+': '+path+' is missing '+pattern);
}

// Neon owns SSOT/auth/query authority.
requireText(
  'app/loc/neon-client.js',
  [/from ['"]@neondatabase\/neon-js['"]/,/createClient/,/getNeonPublicToken/,/neonAuthClient=createClient/],
  'Neon client boundary'
);

// TanStack Query coordinates data-heavy feature requests.
requireText(
  'app/modular-v2/features/StatisticsV2.jsx',
  [/from ['"]@tanstack\/react-query['"]/,/selectScopeRankingTypes/,/selectScopeSourceTrendRows/,/from ['"]recharts['"]/],
  'Statistics Query/Neon/Recharts interop'
);
requireText(
  'app/modular-v2/features/CultureV2.jsx',
  [/from ['"]@tanstack\/react-query['"]/,/selectScopeCultureData/,/CultureTimelineV2/],
  'Culture Query/Neon/Timeline interop'
);

// FlexSearch is surface lexical/cache search only; global corpus search remains Neon-first.
requireText(
  'app/loc/surface-search.js',
  [/from ['"]flexsearch['"]/,/new Index\(/,/cache:cacheSize/,/index\.add\(/,/index\.search\(/],
  'FlexSearch surface-search boundary'
);
const providers=read('app/loc/search-providers.js');
for(const token of ["count:'exact',head:true",".or(",".range(","outputColumns.join(',')"]){
  if(!providers.includes(token))failures.push('Global Search direct Neon query contract missing '+token);
}
if(/flexsearch|createSurfaceSearch|new Index\(/i.test(providers)){
  failures.push('Global Search providers must not turn FlexSearch into corpus authority');
}

// Karaul only analyzes already-aggregated river density.
requireText(
  'app/modular-v2/modules/culture-timeline/river-density-analysis.mjs',
  [/from ['"]karaul['"]/,/detectChangepoints/,/new PoissonCost\(\)/,/aggregateRiverDensity/],
  'Culture density changepoint boundary'
);

// Motion owns the global scroll progress presentation only.
requireText(
  'app/AppExperience.jsx',
  [/from ['"]motion\/react['"]/,/useScroll/,/useSpring/,/<motion\.div/],
  'Motion presentation boundary'
);

// React Select is used in Current management and LunaRunes controls.
requireText(
  'app/loc/GovernanceManagement.jsx',
  [/from ['"]react-select['"]/,/useNeonAccount/,/CultureTimelineEditor/],
  'Scope management React Select/Neon Auth boundary'
);
requireText(
  'app/loc/views/AdminHomeView.jsx',
  [/from ['"]react-select['"]/,/useNeonAccount/,/canManageGlobalSync/],
  'Admin React Select/Neon Auth boundary'
);

// Visualization packages each have one explicit feature owner.
requireText(
  'app/modular-v2/modules/scope-overview/ScopeOverviewNetwork.jsx',
  [/import\(['"]vis-network\/standalone['"]\)/,/new Network\(/],
  'Scope overview vis-network boundary'
);
requireText(
  'app/modular-v2/modules/culture-timeline/CultureTimelineV2.jsx',
  [/from ['"]vis-timeline\/standalone['"]/,/new Timeline\(/],
  'Culture vis-timeline boundary'
);

// Zod validates Current feature/auth/data contracts.
requireText(
  'app/loc/scope-feature-contracts.js',
  [/from ['"]zod['"]/,/z\.object\(/],
  'Zod schema-definition boundary'
);
requireText(
  'app/loc/neon-culture-client.js',
  [/ScopeCultureResponseSchema\.parse\(/],
  'Culture Zod parse boundary'
);
requireText(
  'app/loc/neon-statistics-client.js',
  [/ScopeRankingResponseSchema\.parse\(/],
  'Statistics Zod parse boundary'
);

// Playwright + axe are Current browser/accessibility test dependencies.
requireText(
  'tests/ui-a11y.spec.mjs',
  [/from ['"]@playwright\/test['"]/,/from ['"]@axe-core\/playwright['"]/],
  'Playwright accessibility boundary'
);

if(failures.length){
  console.error('[package-interoperability] violations:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[package-interoperability] every direct package has a Current owner and bounded role');
