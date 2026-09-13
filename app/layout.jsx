import './globals.css';

export const metadata = {
  title: 'LOC 月典',
  description: 'LOC language system model migration shell.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body className="next-migration-shell">
        {children}
        <footer className="loc-site-footer">
          <div><a href="/">LOC月典(LunaCodex)</a></div>
          <div>By <a href="https://whoami.lo3rwang.cc/">Lucas Oscar Wang 政德</a></div>
          <div><a href="mailto:sopa2306@gmail.com">意見信箱</a></div>
          <div>in EsotericVerse 秘藝文域（籌備中）</div>
        </footer>
      </body>
    </html>
  );
}
