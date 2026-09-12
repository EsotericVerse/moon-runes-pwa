import './globals.css';

export const metadata = {
  title: 'LOC 月典',
  description: 'LOC language system model migration shell.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body className="next-migration-shell">{children}</body>
    </html>
  );
}
