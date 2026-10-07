import './globals.css';
import AppShell from './AppShell';
import {LOC_ORIGIN} from './seo/metadata';
import {SCOPES} from './modular/scope-registry';

export const metadata = {
  metadataBase:new URL(LOC_ORIGIN),
  title:'LOC 月典',
  description:'月典是一套語言建構框架工具，用來整理文字、作品與時間脈絡。',
  applicationName:'LOC 月典',
  referrer:'origin-when-cross-origin'
};

const AUTO_DAY_THEME_ID='theme-7';
const AUTO_NIGHT_THEME_ID='theme-1';
const INITIAL_SCOPE_THEMES=Object.values(SCOPES).map(scope=>({
  domain:scope.domain||'',
  mount:scope.mount||null,
  theme:scope.theme||{mode:'auto'}
}));
const INITIAL_THEME_IDS=[...new Set([
  AUTO_DAY_THEME_ID,
  AUTO_NIGHT_THEME_ID,
  ...INITIAL_SCOPE_THEMES.map(scope=>scope.theme?.themeId).filter(Boolean)
])];
const INITIAL_THEME_SCHEMES=Object.freeze({
  'theme-1':'dark',
  'theme-2':'light',
  'theme-3':'light',
  'theme-4':'light',
  'theme-5':'light',
  'theme-6':'dark',
  'theme-7':'light',
  'theme-8':'dark'
});
const INITIAL_THEME_SLOTS=Object.fromEntries(INITIAL_THEME_IDS.map(id=>[
  id,
  {id,scheme:INITIAL_THEME_SCHEMES[id]||'dark'}
]));
const INITIAL_THEME_SCRIPT=`(()=>{try{
  const slots=${JSON.stringify(INITIAL_THEME_SLOTS)};
  const scopes=${JSON.stringify(INITIAL_SCOPE_THEMES)};
  const host=window.location.hostname.toLowerCase();
  const pathname=(window.location.pathname||'/').toLowerCase();
  const match=scopes.find(scope=>{
    if(!scope.mount)return false;
    const base=String(scope.mount.path||'/').replace(/\\/+$/,'')||'/';
    return host===String(scope.mount.host||'').toLowerCase()&&(pathname===base||pathname.startsWith(base+'/'));
  })||scopes.find(scope=>scope.domain&&host===String(scope.domain).toLowerCase());
  const policy=match?.theme||{mode:'auto'};
  let themeId=policy.mode==='fixed'?policy.themeId:'';
  if(!themeId){
    let hour=new Date().getHours();
    try{
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
      const part=parts.find(item=>item.type==='hour');
      if(part)hour=Number(part.value);
    }catch{}
    themeId=hour>=6&&hour<18?'${AUTO_DAY_THEME_ID}':'${AUTO_NIGHT_THEME_ID}';
  }
  const slot=slots[themeId];
  if(!slot)return;
  const root=document.documentElement;
  root.dataset.theme=slot.scheme;
  root.dataset.themeId=slot.id;
  root.style.colorScheme=slot.scheme;
  root.dataset.themeBootstrap='scheme-only';
}catch{}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <script id="loc-theme-bootstrap" dangerouslySetInnerHTML={{__html:INITIAL_THEME_SCRIPT}} />
      </head>
      <body className="loc-app-shell">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
