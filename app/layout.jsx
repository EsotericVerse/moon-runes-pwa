import './globals.css';
import GlobalNav from './GlobalNav';
import AppExperience from './AppExperience';
import ScopeFooterV2 from './modular-v2/ScopeFooterV2';
import QueryProvider from './QueryProvider';
import {LOC_ORIGIN} from './seo/metadata';

export const metadata = {
  metadataBase:new URL(LOC_ORIGIN),
  title:'LOC 月典',
  description:'月典是一套語言建構框架工具，用來整理文字、作品與時間脈絡。',
  applicationName:'LOC 月典',
  referrer:'origin-when-cross-origin'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className="loc-app-shell">
        <QueryProvider>
          <AppExperience />
          <GlobalNav />
          {children}
          <ScopeFooterV2 />
        </QueryProvider>
      </body>
    </html>
  );
}
