'use client';

import { useEffect, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../loc/data';

export default function RuneAtlasHome() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetchLocJson(LOC_DATA.RUNES)
      .then(rows => {
        if (!live) return;
        const canonical = (Array.isArray(rows) ? rows : []).filter(row => Number(row?.編號) >= 1 && Number(row?.編號) <= 66);
        if (canonical.length < 66) throw new Error('核心符文資料不完整。');
        setReady(true);
      })
      .catch(err => live && setError(`符文圖鑑資料載入失敗：${err?.message || '未知錯誤'}`));
    return () => { live = false; };
  }, []);

  if (error) return <section className="loc-card" id="library"><p className="loc-error">{error}</p></section>;
  if (!ready) return <section className="loc-card" id="library"><p className="loc-note">符文圖鑑載入中……</p></section>;

  return <section className="loc-card" id="library">
    <p className="loc-eyebrow">Rune Atlas</p>
    <h2>符文圖鑑</h2>
    <p className="loc-subtitle">以 66 符總圖查看整體結構；群組與單卡請由各自入口進入。</p>
    <div className="runes-atlas-overview">
      <img src="/assets/lunarunes/reference/loc_runes_66_overview.jpg" alt="月之符文 66 符關聯總圖" loading="lazy" decoding="async"/>
    </div>
  </section>;
}
