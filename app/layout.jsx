import './globals.css';
import GlobalNav from './GlobalNav';

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
        <footer className="loc-site-footer">
          <div><a href="/">月典</a>｜<a href="/governance">治理</a></div>
          <div><a href="https://whoami.lo3rwang.cc/">作者</a>｜<a href="mailto:sopa2306@gmail.com">聯絡方式</a>｜公司(秘藝文域 籌備中)</div>
        </footer>
      </body>
    </html>
  );
}
