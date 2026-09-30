export const dynamic='force-static';

export default function manifest(){
  return {
    id:'/',
    name:'LOC｜月典｜語言架構框架',
    short_name:'LOC 月典',
    description:'月典是一套語言建構框架工具，用來整理文字、作品與時間脈絡，並透過搜尋、統計與時間變化協助回看資料。',
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
