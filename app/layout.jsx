import './globals.css';
import GlobalNav from './GlobalNav';
import GlobalFooter from './GlobalFooter';

export const metadata = {
  title: 'LOC 月典',
  description: 'LOC language system model migration shell.'
};

const themeInitScript = `(() => {
  try {
    const saved = localStorage.getItem('loc-theme');
    const hour = new Date().getHours();
    const autoTheme = hour >= 6 && hour < 18 ? 'light' : 'dark';
    const theme = saved === 'light' || saved === 'dark' ? saved : autoTheme;
    document.documentElement.dataset.theme = theme;
  } catch {}
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="next-migration-shell">
        <GlobalNav />
        {children}
        <GlobalFooter />
      </body>
    </html>
  );
}
