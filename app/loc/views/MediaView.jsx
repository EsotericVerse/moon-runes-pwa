'use client';

import { useEffect, useMemo, useState } from 'react';
import { LOC_DATA } from '../data-paths.mjs';

const GROUPS = [
  ['all', '全部'],
  ['music', '音樂關聯'],
  ['runes', '符文／系統'],
  ['visual', '視覺／個人'],
  ['other', '其他多媒體'],
  ['linked', '有公開連結']
];

function text(value) {
  return value == null ? '' : String(value).trim();
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function deriveGroup(item) {
  const purpose = text(item.purpose).toLowerCase();
  const type = text(item.media_type).toLowerCase();
  // Current classification must use semantic/purpose fields, not deprecated numbered LOC provenance.
  if (purpose.includes('rune') || purpose === 'public_divination') return 'runes';
  if (item.linked_song_id || purpose.includes('music') || purpose.includes('song')) return 'music';
  if (purpose === 'personal_design' || purpose.includes('visual') || type.includes('image') || type.includes('design')) return 'visual';
  return 'other';
}

function displayDate(item) {
  return text(item.media_created_date || item.source_created_date || item?.lifecycle?.created_at || '');
}

function displaySource(item) {
  const refs = list(item.source_refs);
  const sources = refs.map(ref => text(ref?.source_type)).filter(Boolean);
  return [...new Set(sources)].slice(0, 3);
}

function mediaSearchText(item) {
  const semantic = item.semantic_descriptor || {};
  return [
    item.media_id,
    item.title,
    item.media_type,
    item.platform,
    item.purpose,
    item.linked_song_id,
    item.linked_work_id,
    semantic.visual_summary,
    ...list(semantic.manual_tags),
    ...list(semantic.generated_tags),
    ...list(semantic.scene_keywords),
    ...list(semantic.mood)
  ].map(text).filter(Boolean).join(' ').toLowerCase();
}

export default function MediaView() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    let alive = true;
    fetch(LOC_DATA.LOC_MEDIA_REGISTRY)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!alive) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const linked = items.filter(item => text(item.url)).length;
    const music = items.filter(item => deriveGroup(item) === 'music').length;
    const runes = items.filter(item => deriveGroup(item) === 'runes').length;
    const visual = items.filter(item => deriveGroup(item) === 'visual').length;
    return { total, linked, missing: total - linked, music, runes, visual };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(item => {
      if (group === 'linked' && !text(item.url)) return false;
      if (!['all', 'linked'].includes(group) && deriveGroup(item) !== group) return false;
      if (q && !mediaSearchText(item).includes(q)) return false;
      return true;
    });
  }, [items, group, query]);

  useEffect(() => setPage(1), [group, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return <section className="loc-view loc5-view">
    <header className="loc-hero loc5-hero">
      <p className="loc-eyebrow">Media · MultiMedia</p>
      <h1>多媒體</h1>
      <p className="loc-subtitle">把圖像、影音、Reels、系統視覺與其他媒體連回原始作品與脈絡。</p>
      <p>多媒體不把平台當資料模型。這裡直接讀取 Current media registry；公開網址用於展示與回到原作品，沒有網址的歷史媒體仍保留為可追溯資料。</p>
    </header>

    <section className="loc5-stats" aria-label="多媒體統計">
      <article><strong>{stats.total}</strong><span>媒體紀錄</span></article>
      <article><strong>{stats.linked}</strong><span>有公開連結</span></article>
      <article><strong>{stats.missing}</strong><span>僅歷史／待補連結</span></article>
      <article><strong>{stats.music}</strong><span>音樂關聯</span></article>
      <article><strong>{stats.runes}</strong><span>符文／系統</span></article>
      <article><strong>{stats.visual}</strong><span>視覺／個人</span></article>
    </section>

    <section className="loc-card loc5-controls">
      <div className="loc5-filter-row" role="group" aria-label="多媒體分類篩選">
        {GROUPS.map(([key, label]) => <button
          key={key}
          type="button"
          className={`loc5-filter${group === key ? ' is-active' : ''}`}
          onClick={() => setGroup(key)}
        >{label}</button>)}
      </div>
      <label className="loc5-search">
        <span>搜尋多媒體</span>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="歌名、媒體 ID、類型、標記…" />
      </label>
      <p className="loc5-rule-note">分類只使用 Current 語意欄位、作品連結與排除／fallback；歷史 numbered LOC provenance 不參與 Current 分類。無法判斷的媒體保留在其他多媒體。</p>
    </section>

    {status === 'loading' ? <p className="loc-status">載入多媒體 registry…</p> : null}
    {status === 'error' ? <p className="loc-status error">多媒體 registry 載入失敗。</p> : null}

    {status === 'ready' ? <>
      <div className="loc5-result-meta"><span>符合 {filtered.length} 筆</span><span>第 {safePage} / {pages} 頁</span></div>
      <section className="loc5-grid" aria-label="多媒體清單">
        {visible.map(item => {
          const semantic = item.semantic_descriptor || {};
          const tags = [...list(semantic.manual_tags), ...list(semantic.generated_tags), ...list(semantic.scene_keywords)].map(text).filter(Boolean).slice(0, 5);
          const sources = displaySource(item);
          const url = text(item.url);
          return <article className="loc5-item" key={item.media_id}>
            <div className="loc5-item-head">
              <div>
                <p className="loc5-id">{item.media_id}</p>
                <h2>{text(item.title) || '未命名媒體'}</h2>
              </div>
              <span className={`loc5-link-state ${url ? 'is-linked' : 'is-missing'}`}>{url ? '公開連結' : '歷史資料'}</span>
            </div>
            <div className="loc5-meta">
              <span>{text(item.platform) || 'unknown platform'}</span>
              <span>{text(item.media_type) || 'media'}</span>
              {displayDate(item) ? <span>{displayDate(item)}</span> : null}
              {text(item.purpose) ? <span>{item.purpose}</span> : null}
            </div>
            {text(semantic.visual_summary) ? <p className="loc5-summary">{semantic.visual_summary}</p> : null}
            {item.linked_song_id ? <p className="loc5-relation"><strong>音樂</strong> {item.linked_song_id}</p> : null}
            {item.linked_work_id ? <p className="loc5-relation"><strong>Work</strong> {item.linked_work_id}</p> : null}
            {tags.length ? <div className="loc-chip-list">{tags.map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div> : null}
            {sources.length ? <p className="loc5-source">來源：{sources.join(' · ')}</p> : null}
            <div className="loc5-item-actions">
              {url ? <a className="loc-button primary" href={url} target="_blank" rel="noreferrer">開啟原作品</a> : <span className="loc5-no-url">尚無可驗證公開網址</span>}
              <a className="loc-button" href="/search">進階搜尋</a>
            </div>
          </article>;
        })}
      </section>

      {!visible.length ? <p className="loc-status">目前沒有符合這個條件的多媒體紀錄。</p> : null}

      {pages > 1 ? <nav className="loc5-pagination" aria-label="多媒體分頁">
        <button type="button" disabled={safePage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>上一頁</button>
        <span>{safePage} / {pages}</span>
        <button type="button" disabled={safePage >= pages} onClick={() => setPage(value => Math.min(pages, value + 1))}>下一頁</button>
      </nav> : null}
    </> : null}
  </section>;
}
