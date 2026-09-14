const DRAW_LINKS = [
  { href: '/runes?mode=single', label: '抽 1 張' },
  { href: '/runes?mode=2card', label: '抽 2 張' },
  { href: '/runes?mode=3card', label: '抽 3 張' },
  { href: '/runes?mode=5card', label: '抽 5 張' },
  { href: '/runes?mode=ow3gs', label: '抽 11 張' }
];

const FEATURE_LINKS = [
  { href: '/runes/list', label: '符文圖鑑' },
  { href: '/runes?mode=daily', label: '每日符文' },
  { href: '/context', label: '符文脈絡' },
  { href: '/statics', label: '符文統計' },
  { href: '/runes#algorithm', label: '符文演算法' }
];

export default function LunaRunesNav({ current = '' }) {
  const renderLink = ({ href, label }) => current === href
    ? <strong key={href}>{label}</strong>
    : <a key={href} href={href}>{label}</a>;

  return <nav className="loc-card" aria-label="月之符文功能入口">
    <div><strong>月之符文</strong> · <a href="/runes#groups">群組分類</a> · {FEATURE_LINKS.map((item, index) => <span key={item.href}>{index ? ' · ' : ''}{renderLink(item)}</span>)}</div>
    <div aria-label="抽牌入口">{DRAW_LINKS.map((item, index) => <span key={item.href}>{index ? ' · ' : ''}{renderLink(item)}</span>)}</div>
  </nav>;
}

export { DRAW_LINKS, FEATURE_LINKS };
