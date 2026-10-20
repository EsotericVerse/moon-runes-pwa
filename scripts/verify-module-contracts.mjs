import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';

const root=process.cwd();
const failures=[];

function walk(dir,callback){
  if(!existsSync(dir))return;
  for(const name of readdirSync(dir)){
    const path=join(dir,name);
    const stat=statSync(path);
    if(stat.isDirectory())walk(path,callback);else callback(path);
  }
}
function rel(path){return relative(root,path).replaceAll('\\\\','/');}
function resolves(fromFile,specifier){
  const base=resolve(dirname(fromFile),specifier);
  return [base,base+'.js',base+'.jsx',base+'.mjs',join(base,'index.js'),join(base,'index.jsx'),join(base,'index.mjs')].some(existsSync);
}

walk(resolve(root,'app'),path=>{
  if(!/\.(?:js|jsx|mjs)$/.test(path))return;
  const source=readFileSync(path,'utf8');
  const file=rel(path);
  const imports=/(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
  for(const match of source.matchAll(imports)){
    if(!resolves(path,match[1]))failures.push(file+': unresolved relative import '+match[1]);
  }
  if(/silver\.(?:lo3rwang|lrunes)_(?:galaxy(?:_media)?|time)\b/.test(source)){
    failures.push(file+': Scope Galaxy/Time table must resolve through silver.manage');
  }
  if(/\bwork_count\b/.test(source)){
    failures.push(file+': stored work_count is outside the Current live aggregate contract');
  }
  for(const retired of ['modular-v2','scope-v2-','.v2.']){
    if(source.includes(retired))failures.push(file+': retired architecture marker must not return: '+retired);
  }
  if(/\b[A-Za-z][A-Za-z0-9]*V2\b/.test(source)){
    failures.push(file+': retired V2 identifier must not return');
  }
});


// Cover every .mjs dependency in the repository, not only the browser app.
// Node tooling and test entrypoints are included but are not browser bundles.
const mjsInventory={app:[],scripts:[],tests:[],root:[]};
let staticMjsEdges=0;
function auditMjs(path,group){
  if(!path.endsWith('.mjs'))return;
  mjsInventory[group].push(rel(path));
  const content=readFileSync(path,'utf8');
  // Match ESM declarations, not text inside assertions or source-code strings.
  // Dynamic import boundaries are checked separately against each capability.
  const declarations=/^\s*(?:import|export)\s+(?:\{[^}]*\}|[^\n;{}]*?)(?:\s+from\s+|\s*)['"](\.{1,2}\/[^'"]+)['"]/gm;
  for(const match of content.matchAll(declarations)){
    if(!resolves(path,match[1]))failures.push(rel(path)+': unresolved relative module '+match[1]);
    if(match[1].endsWith('.mjs'))staticMjsEdges+=1;
  }
}
for(const group of ['app','scripts','tests']){
  walk(resolve(root,group),path=>auditMjs(path,group));
}
for(const name of readdirSync(root)){
  if(name.endsWith('.mjs')&&statSync(resolve(root,name)).isFile())
    auditMjs(resolve(root,name),'root');
}
const mjsTotal=Object.values(mjsInventory).reduce((sum,files)=>sum+files.length,0);
if(mjsTotal===0)failures.push('No .mjs modules found; inventory cannot be verified');
console.log('[module-contracts] audited '+mjsTotal+' .mjs (app '+
  mjsInventory.app.length+', scripts '+mjsInventory.scripts.length+
  ', tests '+mjsInventory.tests.length+', root '+mjsInventory.root.length+
  '), static .mjs edges: '+staticMjsEdges);

// Non-source Statistics views must not load the source classification engine.
const statisticsSource=readFileSync(resolve(root,'app/modular/features/Statistics.jsx'),'utf8');
const mediaCrossSource=readFileSync(resolve(root,'app/modular/modules/statistics/MediaCrossTagStatistics.jsx'),'utf8');
if(statisticsSource.includes("from '../../loc/statistics-admin-source.mjs'"))
  failures.push('Statistics eagerly imports source-classification model');
if(!statisticsSource.includes("await import('../../loc/statistics-admin-source.mjs')")||
   !statisticsSource.includes("enabled:!isLrunesDaily&&!mediaDimension"))
  failures.push('Statistics source model must be loaded only in an active source mode');

// Galaxy query capability is not part of daily Rune statistics or other
// unrelated rankings; it is downloaded by the active query / chart interaction.
if(statisticsSource.includes("from '../../loc/galaxy-query'")||
   !statisticsSource.includes("const loadGalaxyStatistics=()=>import('../../loc/galaxy-query')")||
   !mediaCrossSource.includes("const {selectMediaCrossPairWorks}=await loadGalaxyStatistics()")||
   !statisticsSource.includes("const {selectMediaCrossTagRows}=await loadGalaxyStatistics()")||
   !statisticsSource.includes("const {selectScopeOverview}=await loadGalaxyStatistics()"))
  failures.push('Statistics Galaxy engines must be loaded on the active query or interaction');

// Media facets have their own React hook state, chart selection and pagination.
// Unrelated statistics never mount the media category/classification controls.
const mediaFacetSource=readFileSync(resolve(root,'app/modular/modules/statistics/MediaFacetStatistics.jsx'),'utf8');
const timeZoomSource=readFileSync(resolve(root,'app/modular/modules/statistics/statistics-time-zoom.mjs'),'utf8');
if(!statisticsSource.includes("dynamic(()=>import('../modules/statistics/MediaFacetStatistics')")||
   statisticsSource.includes('function MediaFacetStatistics(')||
   !mediaFacetSource.includes('export default function MediaFacetStatistics(')||
   !mediaFacetSource.includes("useState('all')")||
   !mediaFacetSource.includes('RUNE_RANKING_PAGE_SIZE')||
   !timeZoomSource.includes('export const RUNE_RANKING_PAGE_SIZE=8'))
  failures.push('Media facets must mount as a mode-specific React capability');

// Media pair visualization and its on-click work lookup are one optional
// capability; unrelated statistics must never instantiate its React tree.
if(!statisticsSource.includes("dynamic(()=>import('../modules/statistics/MediaCrossTagStatistics')")||
   statisticsSource.includes('function MediaCrossTagStatistics(')||
   statisticsSource.includes('function MediaCrossTagPicker(')||
   !mediaCrossSource.includes('export default function MediaCrossTagStatistics(')||
   !mediaCrossSource.includes("const {selectMediaCrossPairWorks}=await loadGalaxyStatistics()"))
  failures.push('Media cross-tag capability must be deferred to the active media-style view');

// Suno's authoring and style classification depend on BlockNote but file/ZIP
// import must not download them until the user opens Suno Import.
const importPanelSource=readFileSync(resolve(root,'app/loc/ManagementImportPanel.jsx'),'utf8');
const sunoPanelSource=readFileSync(resolve(root,'app/loc/SunoImportPanel.jsx'),'utf8');
if(!importPanelSource.includes("const SunoImport=dynamic(()=>import('./SunoImportPanel')")||
   !importPanelSource.includes('sunoOpen?<SunoImport')||
   importPanelSource.includes("from './BlockNoteEditor'")||
   importPanelSource.includes("from './blocknote-content.mjs'")||
   importPanelSource.includes("from './suno-style-meta-tags.mjs'")||
   !sunoPanelSource.includes("from './BlockNoteEditor'")||
   !sunoPanelSource.includes("from './suno-style-meta-tags.mjs'"))
  failures.push('Suno and BlockNote must be separately downloaded only for an active authoring session');

// Prevent parser capabilities from returning to the initial import-panel bundle.

for(const moduleName of ['universal-file-import.mjs','private-archive-universal.mjs']){
  if(importPanelSource.includes("from './"+moduleName+"'"))
    failures.push('Import panel eagerly loads parser: '+moduleName);
  if(!importPanelSource.includes("await import('./"+moduleName+"')"))
    failures.push('Import panel missing on-demand parser: '+moduleName);
}

for(const path of [
  'app/lrunes/RunesClient.jsx',
  'app/lrunes/RuneDrawClient.jsx',
  'app/loc/scope-data.js',
  'app/loc/galaxy-query.js',
  'app/loc/culture-query.js',
  'assets/lunarunes/cards/65.png',
  'assets/lunarunes/cards/66.png'
]){
  if(!existsSync(resolve(root,path)))failures.push('missing Current module/asset: '+path);
}

for(const path of [
  'app/QueryProvider.jsx',
  'app/AppExperience.jsx',
  'app/modular/ScopeNav.jsx',
  'app/modular/ScopeFooter.jsx',
  'app/modular/ThemeSelect.jsx',
  'app/modular/FeaturePage.jsx',
  'app/modular/ContentEditor.jsx',
  'app/modular/WorkFullText.jsx',
  'app/modular/WorkSummaryCard.jsx',
  'app/modular/IncrementalList.jsx',
  'app/loc/scope-table-mapping.js',
  'app/loc/aggregate-query.js',
  'app/loc/search-providers.js',
]){
  if(existsSync(resolve(root,path)))failures.push('retired data-layer module still present: '+path);
}

// The route imports GameBoard's default export. Exporting a helper instead
// silently renders only the Hero and prevents ALL gameplay data requests.
const gameBoardSource=readFileSync(resolve(root,'app/lrunes/game/GameBoard.jsx'),'utf8');
if(!/export\s+default\s+function\s+GameBoard\s*\(/.test(gameBoardSource))
  failures.push('LunaRunes game default export must be GameBoard, not GameHomeHero');

if(failures.length){
  console.error('[module-contracts] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[module-contracts] imports, single Scope data source, shared Galaxy pipeline and retired-column guards verified');
