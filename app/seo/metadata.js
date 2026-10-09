import {SITE_IMAGES} from '../site-images';
import {readScopePageCopy} from './page-copy';

export const LOC_ORIGIN='https://loc.lo3rwang.cc';
export const LUNARUNES_ORIGIN='https://lrunes.lo3rwang.cc';

const LOC_IMAGE=LOC_ORIGIN+SITE_IMAGES.locHero.src;
const LUNARUNES_IMAGE=LUNARUNES_ORIGIN+SITE_IMAGES.lunarunes.src;
const AUTHOR_IMAGE=LOC_ORIGIN+SITE_IMAGES.author.src;

function cleanPath(path='/'){
  const value='/' + String(path||'/').split('?')[0].split('#')[0].split('/').filter(Boolean).join('/');
  return value==='/'?'/':value+'/';
}
function urlFor(origin,path='/'){
  return origin.replace(/\/$/,'')+cleanPath(path);
}
function robotsFor(noIndex=false){
  if(!noIndex)return undefined;
  return {
    index:false,
    follow:true,
    googleBot:{index:false,follow:true}
  };
}
function pageMetadata({
  origin,
  path='/',
  siteName,
  title,
  description,
  image,
  imageAlt,
  noIndex=false
}){
  const canonical=urlFor(origin,path);
  return {
    title,
    description,
    alternates:{canonical},
    openGraph:{
      title,
      description,
      url:canonical,
      siteName,
      locale:'zh_TW',
      type:'website',
      images:[{url:image,alt:imageAlt}]
    },
    twitter:{
      card:'summary_large_image',
      title,
      description,
      images:[image]
    },
    ...(noIndex?{robots:robotsFor(true)}:{})
  };
}

export function locMetadata({title,description,path='/',noIndex=false,image=LOC_IMAGE,imageAlt='LOC 月典'}){
  return pageMetadata({
    origin:LOC_ORIGIN,path,siteName:'LOC 月典',title,description,
    image,imageAlt,noIndex
  });
}

export function lunarunesMetadata({title,description,path='/',noIndex=false,image=LUNARUNES_IMAGE,imageAlt='月之符文'}){
  return pageMetadata({
    origin:LUNARUNES_ORIGIN,path,siteName:'月之符文',title,description,
    image,imageAlt,noIndex
  });
}

export function authorMetadata({title,description,path='/lo3rwang/',noIndex=false}){
  return pageMetadata({
    origin:LOC_ORIGIN,path,siteName:'Lucas Oscar Wang 政德',title,description,
    image:AUTHOR_IMAGE,imageAlt:'Lucas Oscar Wang 政德',noIndex
  });
}

export function locWebSiteJsonLd(){
  return {
    '@context':'https://schema.org',
    '@type':'WebSite',
    name:'LOC 月典',
    alternateName:['月典','LOC','loc.lo3rwang.cc'],
    url:LOC_ORIGIN+'/'
  };
}

export function lunarunesWebSiteJsonLd(){
  return {
    '@context':'https://schema.org',
    '@type':'WebSite',
    name:'月之符文',
    alternateName:['LunaRunes','lrunes.lo3rwang.cc'],
    url:LUNARUNES_ORIGIN+'/'
  };
}

export function authorProfileJsonLd(){
  return {
    '@context':'https://schema.org',
    '@type':'ProfilePage',
    url:LOC_ORIGIN+'/lo3rwang/',
    mainEntity:{
      '@type':'Person',
      '@id':LOC_ORIGIN+'/lo3rwang/#author',
      name:'Lucas Oscar Wang 政德',
      alternateName:['政德','Oscar','lo3rwang'],
      description:'語言建築師，LOC 月典與月之符文作者。',
      url:LOC_ORIGIN+'/lo3rwang/',
      image:AUTHOR_IMAGE
    }
  };
}

export async function lunarunesPageCopyMetadata({path='/',noIndex=false}={}){
  const fields=await readScopePageCopy('lrunes');
  return lunarunesMetadata({title:fields.Desc_TW,description:fields.Desc_TW,path,noIndex});
}

export async function authorPageCopyMetadata({path='/lo3rwang/',noIndex=false}={}){
  const fields=await readScopePageCopy('lo3rwang');
  return authorMetadata({title:fields.Desc_TW,description:fields.Desc_TW,path,noIndex});
}
