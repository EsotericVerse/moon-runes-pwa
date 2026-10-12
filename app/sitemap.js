import {LOC_ORIGIN} from './seo/metadata';

export const dynamic='force-static';

function url(path='/'){
  const clean='/' + String(path||'/').split('/').filter(Boolean).join('/');
  return LOC_ORIGIN+(clean==='/'?'/':clean+'/');
}

export default function sitemap(){
  return [
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
  ].map(path=>({url:url(path)}));
}
