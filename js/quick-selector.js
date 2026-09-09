const STYLE_ID = 'loc-quick-selector-style';

function ensureStyle(){
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .quick-selector{margin:0 0 20px;padding:16px;border:1px solid var(--line,var(--loc-border,rgba(180,158,255,.22)));border-radius:18px;background:rgba(255,255,255,.025)}
    .quick-selector-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .quick-selector-btn{min-height:44px;padding:9px 10px;border:1px solid var(--line,var(--loc-border,rgba(180,158,255,.22)));border-radius:12px;background:rgba(255,255,255,.025);color:var(--muted,var(--loc-muted,#b9bfd0));font:inherit;font-weight:700;cursor:pointer;transition:border-color .15s ease,background .15s ease,color .15s ease,transform .15s ease}
    .quick-selector-btn:hover,.quick-selector-btn:focus-visible{border-color:rgba(231,194,125,.55);color:var(--text,var(--loc-text,#f5f1ff));transform:translateY(-1px)}
    .quick-selector-btn.is-active{border-color:rgba(231,194,125,.7);background:rgba(231,194,125,.09);color:var(--gold,var(--loc-gold,#e7c27d))}
    .quick-selector-detail{margin-top:12px;padding:14px 16px;border-left:3px solid var(--gold,var(--loc-gold,#e7c27d));border-radius:10px;background:rgba(231,194,125,.06)}
    .quick-selector-kicker{color:var(--purple,var(--loc-purple,#b49eff));font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    .quick-selector-title{margin:4px 0 6px;color:var(--gold,var(--loc-gold,#e7c27d));font-size:1rem;line-height:1.4}
    .quick-selector-copy{margin:0;color:var(--muted,var(--loc-muted,#b9bfd0));font-size:.84rem;line-height:1.65}
    .quick-selector-extra{margin-top:8px;color:var(--muted,var(--loc-muted,#b9bfd0));font-size:.78rem;line-height:1.6}
    .quick-selector-link{display:inline-flex;margin-top:10px;color:var(--gold,var(--loc-gold,#e7c27d));font-size:.8rem;font-weight:800;text-decoration:none}
    @media(max-width:720px){.quick-selector-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
}

export function mountQuickSelector({ target, items = [], initialId = null, onSelect = null }){
  const root = typeof target === 'string' ? document.querySelector(target) : target;
  if (!root || !Array.isArray(items) || !items.length) return null;
  ensureStyle();

  root.classList.add('quick-selector');
  root.innerHTML = '<div class="quick-selector-grid" role="tablist"></div><div class="quick-selector-detail" aria-live="polite"></div>';
  const grid = root.querySelector('.quick-selector-grid');
  const detail = root.querySelector('.quick-selector-detail');

  const byId = new Map(items.map(item => [String(item.id), item]));

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function renderDetail(item){
    const extra = Array.isArray(item.extra) ? item.extra.filter(Boolean).join(' · ') : (item.extra || '');
    detail.innerHTML = `${item.kicker ? `<div class="quick-selector-kicker">${esc(item.kicker)}</div>` : ''}<h3 class="quick-selector-title">${esc(item.title || '')}</h3>${item.description ? `<p class="quick-selector-copy">${esc(item.description)}</p>` : ''}${extra ? `<div class="quick-selector-extra">${esc(extra)}</div>` : ''}${item.href ? `<a class="quick-selector-link" href="${esc(item.href)}">${esc(item.linkLabel || '延伸查看')} →</a>` : ''}`;
  }

  function select(id){
    const key = String(id);
    const item = byId.get(key);
    if (!item) return;
    grid.querySelectorAll('.quick-selector-btn').forEach(btn => {
      const active = btn.dataset.quickId === key;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    renderDetail(item);
    if (typeof onSelect === 'function') onSelect(item);
  }

  grid.innerHTML = items.map(item => `<button class="quick-selector-btn" type="button" role="tab" data-quick-id="${esc(item.id)}" aria-selected="false">${esc(item.label || item.title || item.id)}</button>`).join('');
  grid.addEventListener('click', event => {
    const btn = event.target.closest('.quick-selector-btn');
    if (btn) select(btn.dataset.quickId);
  });

  select(initialId ?? items[0].id);
  return { select, root };
}
