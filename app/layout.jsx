import './globals.css';
import GlobalNav from './GlobalNav';
import GlobalFooter from './GlobalFooter';
import QueryProvider from './QueryProvider';

export const metadata = {
  title: 'LOC 月典',
  description: 'LOC Modelized Language Framework application shell.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className="next-migration-shell">
        <QueryProvider>
          <GlobalNav />
          {children}
          <GlobalFooter />
        </QueryProvider>
      </body>
    </html>
  );
}
