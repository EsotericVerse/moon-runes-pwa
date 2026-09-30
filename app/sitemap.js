import {LOC_ORIGIN,LUNARUNES_ORIGIN} from './seo/metadata';
import {runeParams} from './lrunes/rune-directory.mjs';

export const dynamic='force-static';

function url(origin,path='/'){
  const clean='/' + String(path||'/').split('/').filter(Boolean).join('/');
  return origin+(clean==='/'?'/':clean+'/');
}

export default function sitemap(){
  const locPaths=[
    '/',
    '/statics',
    '/culture',
    '/governance',
    '/lo3rwang',
    '/lo3rwang/work',
    '/lo3rwang/other',
    '/lo3rwang/statics',
    '/lo3rwang/culture',
    '/lo3rwang/governance'
  ];

  const runePaths=[
    '/',
    '/statics',
    '/culture',
    '/governance',
    '/list',
    '/game',
    '/daily/log',
    '/daily/trend',
    '/duel/one',
    '/duel/daily',
    '/duel/two',
    '/duel/three',
    '/duel/five',
    '/duel/ow3gs'
  ];

  const runeDirectory=[
    ...Array.from({length:9},(_,index)=>'/list/'+String(index+1).padStart(2,'0')),
    ...runeParams().map(({group,rune})=>'/list/'+group+'/'+rune)
  ];

  return [
    ...locPaths.map(path=>({url:url(LOC_ORIGIN,path)})),
    ...[...runePaths,...runeDirectory].map(path=>({url:url(LUNARUNES_ORIGIN,path)}))
  ];
}
