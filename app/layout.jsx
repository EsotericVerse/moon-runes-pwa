import './globals.css';
import GlobalNav from './GlobalNav';
import GlobalFooter from './GlobalFooter';

export const metadata = {
  title: 'LOC 月典',
  description: 'LOC Language Module Framework application shell.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className="next-migration-shell">
        <GlobalNav />
        {children}
        <GlobalFooter />
      </body>
    </html>
  );
}
