'use client';

import { useEffect, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../loc/data';
import RuneAtlas from './RuneAtlas';

export default function RuneAtlasHome() {
  const [runes, setRunes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [group, setGroup] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    Promise.all([fetchLocJson(LOC_DATA.RUNES), fetchLocJson(LOC_DATA.RUNE_GROUPS)])
      .then(([rows, groupAuthority]) => {
        if (!live) return;
        const canonical = (Array.isArray(rows) ? rows : []).filter(row => Number(row?.編號) >= 1 && Number(row?.編號) <= 66);
        setRunes(canonical);
        setGroups(Array.isArray(groupAuthority?.groups) ? groupAuthority.groups : []);
        setError('');
      })
      .catch(err => live && setError(`符文圖鑑資料載入失敗：${err?.message || '未知錯誤'}`));
    return () => { live = false; };
  }, []);

  if (error) return <section className="loc-card" id="library"><p className="loc-error">{error}</p></section>;
  if (!runes.length || !groups.length) return <section className="loc-card" id="library"><p className="loc-note">符文圖鑑載入中……</p></section>;

  if (!expanded) return <section className="loc-card" id="library">
    <p className="loc-eyebrow">Rune Atlas</p>
    <h2>所有符文</h2>
    <p className="loc-subtitle">先看 66 符的整體關係，再從群組往單一符文深入。</p>
    <button type="button" className="runes-atlas-overview interactive" onClick={() => setExpanded(true)} aria-expanded="false">
      <img src="/assets/lunarunes/reference/loc_runes_66_overview.jpg" alt="月之符文 66 符關聯總圖" loading="lazy" decoding="async"/>
      <span>點圖查看符文群組</span>
    </button>
  </section>;

  return <RuneAtlas runes={runes} groups={groups} group={group} setGroup={setGroup} />;
}
