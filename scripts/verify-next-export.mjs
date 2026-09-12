import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const required=[
  'out/index.html',
  'out/loc/index.html',
  'out/data/json/generated/search/SEARCH_SOURCE_STATS.json',
  'out/data/json/registries/LOC_GRAPH_SCHEMA.json',
  'out/data/json/registries/LOC_ERA_REGISTRY.json',
  'out/data/json/registries/LOC8_DAILY_RUNE_REPO_HISTORY.json',
  'out/data/json/generated/loc4/corpus/LOC4_TEXT_CORPUS_MANIFEST.json',
  'out/data/json/search/loc3/LOC3_LYRICS_SEARCH_v0.1.json'
];
const missing=required.filter(path=>!existsSync(resolve(process.cwd(),path)));
if(missing.length){console.error('[next-export] missing required files:\n'+missing.join('\n'));process.exit(1);}
const html=readFileSync(resolve(process.cwd(),'out/index.html'),'utf8');
if(!html.includes('LOC')||!html.includes('_next')){console.error('[next-export] root output is not a valid LOC Next export');process.exit(1);}
console.log(`[next-export] verified ${required.length} required LOC export files`);
