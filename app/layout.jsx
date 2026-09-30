import './globals.css';
import GlobalNav from './GlobalNav';
import Rc81Experience from './Rc81Experience';
import ScopeFooterV2 from './modular-v2/ScopeFooterV2';
import QueryProvider from './QueryProvider';

export const metadata = {
  title: 'LOC 月典',
  description: 'LOC Language Architecture Framework application shell.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className="next-migration-shell">
        <QueryProvider>
          <Rc81Experience />
          <GlobalNav />
          {children}
          <ScopeFooterV2 />
        </QueryProvider>
      </body>
    </html>
  );
}
