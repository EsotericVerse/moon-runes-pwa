import {LOC_ORIGIN} from './seo/metadata';

export const dynamic='force-static';

export default function robots(){
  return {
    rules:{userAgent:'*',allow:'/'},
    sitemap:LOC_ORIGIN+'/sitemap.xml'
  };
}
