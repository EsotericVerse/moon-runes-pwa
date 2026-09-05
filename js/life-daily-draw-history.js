(() => {
  const records = [
    { date:'2026-08-05', kind:'主抽', rune:'分', direction:'正位' },
    { date:'2026-08-06', kind:'主抽', rune:'風', direction:'逆位' },
    { date:'2026-08-07', kind:'主抽', rune:'水', direction:'逆位' },
    { date:'2026-08-08', kind:'主抽', rune:'葉', direction:'逆位' },
    { date:'2026-08-09', kind:'主抽', rune:'封', direction:'正位' },
    { date:'2026-08-10', kind:'主抽', rune:'空', direction:'半逆位' },
    { date:'2026-08-11', kind:'主抽', rune:'心', direction:'半正位' },
    { date:'2026-08-12', kind:'主抽', rune:'幻', direction:'半正位' },
    { date:'2026-08-13', kind:'主抽', rune:'分', direction:'逆位' },
    { date:'2026-08-14', kind:'主抽', rune:'誤', direction:'正位' },
    { date:'2026-08-15', kind:'主抽', rune:'靈', direction:'正位' },
    { date:'2026-08-16', kind:'主抽', rune:'星', direction:'正位' },
    { date:'2026-08-17', kind:'主抽', rune:'雷', direction:'正位' },
    { date:'2026-08-18', kind:'主抽', rune:'玉', direction:'逆位' },
    { date:'2026-08-18', kind:'補抽', rune:'氣', direction:'半逆位' },
    { date:'2026-08-19', kind:'主抽', rune:'水', direction:'逆位' },
    { date:'2026-08-20', kind:'主抽', rune:'地', direction:'正位' },
    { date:'2026-08-21', kind:'主抽', rune:'雷', direction:'半正位' },
    { date:'2026-08-22', kind:'主抽', rune:'花', direction:'逆位' },
    { date:'2026-08-23', kind:'主抽', rune:'根', direction:'逆位' },
    { date:'2026-08-24', kind:'主抽', rune:'土', direction:'逆位' },
    { date:'2026-08-24', kind:'補抽', rune:'火', direction:'逆位' },
    { date:'2026-08-25', kind:'主抽', rune:'金', direction:'半逆位' },
    { date:'2026-08-25', kind:'補抽', rune:'花', direction:'逆位' },
    { date:'2026-08-26', kind:'主抽', rune:'鍊', direction:'半逆位' },
    { date:'2026-08-26', kind:'補抽', rune:'土', direction:'正位' },
    { date:'2026-08-27', kind:'主抽', rune:'根', direction:'逆位' },
    { date:'2026-08-27', kind:'補抽', rune:'樹', direction:'正位' },
    { date:'2026-08-28', kind:'主抽', rune:'火', direction:'半逆位' },
    { date:'2026-08-28', kind:'補抽', rune:'晶', direction:'正位' },
    { date:'2026-08-29', kind:'主抽', rune:'日', direction:'半逆位' },
    { date:'2026-08-29', kind:'補抽', rune:'晶', direction:'半逆位' },
    { date:'2026-08-30', kind:'主抽', rune:'氣', direction:'正位' },
    { date:'2026-08-31', kind:'主抽', rune:'星', direction:'正位' },
    { date:'2026-09-01', kind:'主抽', rune:'分', direction:'正位' },
    { date:'2026-09-01', kind:'補抽', rune:'愛', direction:'逆位' },
    { date:'2026-09-02', kind:'主抽', rune:'鏡', direction:'半逆位' },
    { date:'2026-09-02', kind:'補抽', rune:'樹', direction:'正位' },
    { date:'2026-09-03', kind:'主抽', rune:'果', direction:'半逆位' },
    { date:'2026-09-04', kind:'主抽', rune:'玉', direction:'半正位' },
    { date:'2026-09-05', kind:'主抽', rune:'樹', direction:'半正位' },
    { date:'2026-09-05', kind:'補抽', rune:'病', direction:'逆位' },
    { date:'2026-09-06', kind:'主抽', rune:'玄', direction:'半正位' }
  ];

  function esc(value='') {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function groupByDate() {
    const map = new Map();
    records.forEach(record => {
      if (!map.has(record.date)) map.set(record.date, []);
      map.get(record.date).push(record);
    });
    return [...map.entries()].sort((a,b) => new Date(b[0]) - new Date(a[0]));
  }

  function render() {
    const host = document.querySelector('#daily-draw .body');
    if (!host || document.querySelector('#daily-draw-history-static')) return;

    const style = document.createElement('style');
    style.textContent = `
      .draw-archive{margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}
      .draw-archive-head{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:12px}
      .draw-archive-head h4{margin:0;font-size:15px}
      .draw-archive-head p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
      .draw-archive-list{display:grid;gap:8px}
      .draw-archive-day{display:grid;grid-template-columns:92px 1fr;gap:12px;padding:11px 13px;border:1px solid var(--line);border-radius:13px;background:rgba(255,255,255,.02)}
      .draw-archive-date{color:var(--muted);font-size:12px;padding-top:2px}
      .draw-archive-items{display:flex;gap:8px;flex-wrap:wrap}
      .draw-archive-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;border:1px solid var(--line-strong);font-size:12px;background:rgba(169,199,255,.06)}
      .draw-archive-chip.supplement{border-style:dashed;color:var(--accent-2)}
      .draw-archive-kind{color:var(--muted);font-size:11px}
      @media (max-width:760px){.draw-archive-day{grid-template-columns:1fr}.draw-archive-items{gap:6px}}
    `;
    document.head.appendChild(style);

    const section = document.createElement('section');
    section.id = 'daily-draw-history-static';
    section.className = 'draw-archive';
    section.innerHTML = `
      <div class="draw-archive-head">
        <div>
          <h4>2026/08–09 歷史抽牌總表</h4>
          <p>目前可確認紀錄自 2026/08/05 起；共 ${records.length} 筆，主抽與補抽分開標示。未確認日期不自行補值。</p>
        </div>
        <span class="badge">${records.length} 筆</span>
      </div>
      <div class="draw-archive-list">
        ${groupByDate().map(([date, items]) => `
          <div class="draw-archive-day">
            <div class="draw-archive-date">${esc(date)}</div>
            <div class="draw-archive-items">
              ${items.map(item => `
                <span class="draw-archive-chip ${item.kind === '補抽' ? 'supplement' : ''}">
                  <span class="draw-archive-kind">${esc(item.kind)}</span>
                  <strong>${esc(item.rune)}${esc(item.direction)}</strong>
                </span>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    host.appendChild(section);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else {
    render();
  }
})();
