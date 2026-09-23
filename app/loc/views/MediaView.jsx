'use client';

import { useEffect, useMemo, useState } from 'react';
import { selectMediaLinks } from '../neon-media-links';

const GROUPS = [
  ['all', '全部'],
  ['song', '音樂連結'],
  ['culture', '文化連結']
];

function text(value) {
  return value == null ? '' : String(value).trim();
}

function mediaSearchText(item) {
  return [
    item.link_id,
    item.label,
    item.href,
    item.kind,
    item.source,
    item.scope_id
  ].map(text).filter(Boolean).join(' ').toLowerCase();
}

export default function MediaView() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [page, setPage] = useState(1);
  const [sourceWarning, setSourceWarning] = useState('');
  const pageSize = 12;

  useEffect(() => {
    let alive = true;
    selectMediaLinks()
      .then(data => {
        if (!alive) return;
        setItems(Array.isArray(data?.rows) ? data.rows : []);
        if (data?.failures?.length) setSourceWarning('部分已確認連結來源暫時無法讀取。');
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const song = items.filter(item => item.kind === 'song').length;
    const culture = items.filter(item => item.kind === 'culture').length;
    return { total, song, culture };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(item => {
      if (group !== 'all' && item.kind !== group) return false;
      if (q && !mediaSearchText(item).includes(q)) return false;
      return true;
    });
  }, [items, group, query]);

  useEffect(() => setPage(1), [group, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return <section className="loc-view multimedia-view">
    <header className="loc-hero multimedia-hero">
      <p className="loc-eyebrow">MultiMedia</p>
      <h1>多媒體</h1>
      <p className="loc-subtitle">只呈現已確認來源中的公開連結，回到原作品與文化脈絡。</p>
      <p>正式 media table 尚未由 Neon catalog 確認；本頁不猜 table name、不載入 JSON，只讀取目前已治理的歌曲與文化連結。</p>
    </header>

    <section className="multimedia-stats" aria-label="多媒體連結統計">
      <article><strong>{stats.total}</strong><span>公開連結</span></article>
      <article><strong>{stats.song}</strong><span>音樂連結</span></article>
      <article><strong>{stats.culture}</strong><span>文化連結</span></article>
    </section>

    <section className="loc-card multimedia-controls">
      <div className="multimedia-filter-row" role="group" aria-label="多媒體分類篩選">
        {GROUPS.map(([key, label]) => <button
          key={key}
          type="button"
          className={`multimedia-filter${group === key ? ' is-active' : ''}`}
          onClick={() => setGroup(key)}
        >{label}</button>)}
      </div>
      <label className="multimedia-search">
        <span>搜尋多媒體</span>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="歌名、媒體 ID、類型、標記…" />
      </label>
      <p className="multimedia-rule-note">這裡不建立媒體語意分類，也不補造歷史資料；分類只反映已確認的 Neon link source。</p>
    </section>

    {status === 'loading' ? <p className="loc-status">載入多媒體連結…</p> : null}
    {status === 'error' ? <p className="loc-status error">多媒體連結載入失敗。</p> : null}
    {sourceWarning ? <p className="loc-status">{sourceWarning}</p> : null}

    {status === 'ready' ? <>
      <div className="multimedia-result-meta"><span>符合 {filtered.length} 筆</span><span>第 {safePage} / {pages} 頁</span></div>
      <section className="multimedia-grid" aria-label="多媒體連結清單">
        {visible.map(item => {
          return <article className="multimedia-item" key={item.link_id}>
            <div className="multimedia-item-head">
              <div>
                <p className="multimedia-id">{item.link_id}</p>
                <h2>{text(item.label) || '未命名連結'}</h2>
              </div>
              <span className="multimedia-link-state is-linked">公開連結</span>
            </div>
            <div className="multimedia-meta">
              <span>{text(item.kind)}</span>
              <span>{text(item.source)}</span>
              {text(item.scope_id) ? <span>{item.scope_id}</span> : null}
            </div>
            <div className="multimedia-item-actions">
              <a className="loc-button primary" href={item.href} target="_blank" rel="noreferrer">開啟原作品</a>
              <a className="loc-button" href={`/search?q=${encodeURIComponent(text(item.label) || item.link_id)}`}>搜尋關聯</a>
            </div>
          </article>;
        })}
      </section>

      {!visible.length ? <p className="loc-status">目前沒有符合這個條件的多媒體紀錄。</p> : null}

      {pages > 1 ? <nav className="multimedia-pagination" aria-label="多媒體連結分頁">
        <button type="button" disabled={safePage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>上一頁</button>
        <span>{safePage} / {pages}</span>
        <button type="button" disabled={safePage >= pages} onClick={() => setPage(value => Math.min(pages, value + 1))}>下一頁</button>
      </nav> : null}
    </> : null}
  </section>;
}
