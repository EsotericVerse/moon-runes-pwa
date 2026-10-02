import './globals.css';
import ScopeNavV2 from './modular-v2/ScopeNavV2';
import AppExperience from './AppExperience';
import ScopeFooterV2 from './modular-v2/ScopeFooterV2';
import QueryProvider from './QueryProvider';
import {LOC_ORIGIN} from './seo/metadata';
import {getThemeSlotV2} from './modular-v2/theme-registry.v2';

export const metadata = {
  metadataBase:new URL(LOC_ORIGIN),
  title:'LOC 月典',
  description:'月典是一套語言建構框架工具，用來整理文字、作品與時間脈絡。',
  applicationName:'LOC 月典',
  referrer:'origin-when-cross-origin'
};

const INITIAL_THEME_IDS=['theme-1','theme-2','theme-5','theme-7'];
const INITIAL_THEME_SLOTS=Object.fromEntries(INITIAL_THEME_IDS.map(id=>{
  const slot=getThemeSlotV2(id);
  return [id,{id:slot.id,scheme:slot.scheme,tokens:slot.tokens}];
}));
const INITIAL_THEME_SCRIPT=`(()=>{try{
  const slots=${JSON.stringify(INITIAL_THEME_SLOTS)};
  const host=window.location.hostname.toLowerCase();
  const pathname=(window.location.pathname||'/').toLowerCase();
  let themeId='';
  if(host==='lrunes.lo3rwang.cc'||pathname==='/lrunes'||pathname.startsWith('/lrunes/')){
    themeId='theme-5';
  }else if(pathname==='/lo3rwang'||pathname.startsWith('/lo3rwang/')){
    themeId='theme-2';
  }else{
    let hour=new Date().getHours();
    try{
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
      const part=parts.find(item=>item.type==='hour');
      if(part)hour=Number(part.value);
    }catch{}
    themeId=hour>=6&&hour<18?'theme-7':'theme-1';
  }
  const slot=slots[themeId];
  if(!slot)return;
  const root=document.documentElement;
  root.dataset.theme=slot.scheme;
  root.dataset.themeId=slot.id;
  root.style.colorScheme=slot.scheme;
  Object.entries(slot.tokens).forEach(([key,value])=>root.style.setProperty(key,value));
}catch{}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <script id="loc-theme-bootstrap" dangerouslySetInnerHTML={{__html:INITIAL_THEME_SCRIPT}} />
      </head>
      <body className="loc-app-shell">
        <QueryProvider>
          <AppExperience />
          <header className="scope-v2-global"><ScopeNavV2/></header>
          {children}
          <ScopeFooterV2 />
        </QueryProvider>
      </body>
    </html>
  );
}
