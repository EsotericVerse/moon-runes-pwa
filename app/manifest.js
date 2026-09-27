export const dynamic='force-static';

export default function manifest(){
  return {
    id:'/',
    name:'LOC｜月典｜語言架構框架',
    short_name:'LOC 月典',
    description:'LOC（月典）是一套 Language Architecture Framework／語言架構框架，用來整理、分析、搜尋並連結文字、時間、來源、風格與作品脈絡。',
    lang:'zh-Hant',
    start_url:'/',
    scope:'/',
    display:'standalone',
    background_color:'#07182d',
    theme_color:'#07182d',
    icons:[
      {src:'/assets/site/icons/icon-192x192.png',sizes:'192x192',type:'image/png'},
      {src:'/assets/site/icons/icon-512x512.png',sizes:'512x512',type:'image/png'}
    ]
  };
}
