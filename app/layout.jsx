import './globals.css';
import AppShell from './AppShell';
import {LOC_ORIGIN} from './seo/metadata';
import {faviconForScope} from './site-favicons';

export const metadata = {
  metadataBase:new URL(LOC_ORIGIN),
  title:'LOC 月典',
  description:'月典是一套語言建構框架工具，用來整理文字、作品與時間脈絡。',
  applicationName:'LOC 月典',
  icons:{icon:[{url:faviconForScope('loc'),type:'image/png'}]},
  referrer:'origin-when-cross-origin'
};

// Keep the iOS WKWebView's native safe-area clipping in control of hit testing.
// RC3.1 used viewport-fit=cover and is under device investigation for missing taps.
export const viewport={width:'device-width',initialScale:1};

const AUTO_DAY_THEME_ID='theme-7';
const AUTO_NIGHT_THEME_ID='theme-1';
const GAME_BOOTSTRAP_THEME_ID='theme-4';
// Static export can only mark the initial color scheme. The exact canonical
// palette and per-Scope default are loaded once from PostgreSQL in AppShell.
const INITIAL_THEME_SCRIPT=`(()=>{try{
  const pathname=(window.location.pathname||'/').toLowerCase();
  let hour=new Date().getHours();
  try{
    const part=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).find(x=>x.type==='hour');
    if(part)hour=Number(part.value);
  }catch{}
  const game=pathname==='/game'||pathname.startsWith('/game/');
  const themeId=game?'${GAME_BOOTSTRAP_THEME_ID}':(hour>=6&&hour<18?'${AUTO_DAY_THEME_ID}':'${AUTO_NIGHT_THEME_ID}');
  const scheme=game||themeId==='${AUTO_NIGHT_THEME_ID}'?'dark':'light';
  const root=document.documentElement;
  root.dataset.theme=scheme;
  root.dataset.themeId=themeId;
  root.style.colorScheme=scheme;
  root.dataset.themeBootstrap='scheme-only';
  // A failed or stalled Theme fetch must not make the whole page invisible.
  window.setTimeout(()=>{
    if(root.dataset.themeBootstrap==='scheme-only')delete root.dataset.themeBootstrap;
  },2000);
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
