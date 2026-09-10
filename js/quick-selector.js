const STYLE_ID = 'loc-quick-selector-style';

function ensureStyle(){
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .quick-selector{margin:0 0 20px;padding:16px;border:1px solid var(--line,var(--loc-border,rgba(180,158,255,.22)));border-radius:18px;background:rgba(255,255,255,.025)}
    .quick-selector-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .quick-selector-btn,.quick-selector-hotspot{min-height:44px;padding:9px 10px;border:1px solid var(--line,var(--loc-border,rgba(180,158,255,.22)));border-radius:12px;background:rgba(5,15,30,.82);color:var(--muted,var(--loc-muted,#b9bfd0));font:inherit;font-weight:800;cursor:pointer;transition:border-color .15s ease,background .15s ease,color .15s ease,transform .15s ease}
    .quick-selector-btn:hover,.quick-selector-btn:focus-visible,.quick-selector-hotspot:hover,.quick-selector-hotspot:focus-visible{border-color:rgba(231,194,125,.7);color:var(--text,var(--loc-text,#f5f1ff))}
    .quick-selector-btn:hover,.quick-selector-btn:focus-visible{transform:translateY(-1px)}
    .quick-selector-btn.is-active,.quick-selector-hotspot.is-active{border-color:rgba(231,194,125,.8);background:rgba(231,194,125,.12);color:var(--gold,var(--loc-gold,#e7c27d))}
    .quick-selector-detail{margin-top:12px;padding:14px 16px;border-left:3px solid var(--gold,var(--loc-gold,#e7c27d));border-radius:10px;background:rgba(231,194,125,.06)}
    .quick-selector-kicker{color:var(--purple,var(--loc-purple,#b49cff));font-size:.72rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;line-height:1.35}
    .quick-selector-title{margin:5px 0 8px;color:var(--gold,var(--loc-gold,#e7c27d));font-size:1.18rem;font-weight:850;line-height:1.35}
    .quick-selector-copy{margin:0;color:var(--muted,var(--loc-muted,#b9bfd0));font-size:.84rem;line-height:1.7}
    .quick-selector-extra{margin-top:10px;color:var(--muted,var(--loc-muted,#b9bfd0));font-size:.78rem;line-height:1.65}
    .quick-selector-content{margin-top:12px}
    .quick-selector-link{display:inline-flex;margin-top:10px;color:var(--gold,var(--loc-gold,#e7c27d));font-size:.8rem;font-weight:800;text-decoration:none}
    .quick-selector-image-stage{position:relative;overflow:hidden;border-radius:16px}
    .quick-selector-image-stage>.overview-image-link{display:block;margin:0}
    .quick-selector-image-stage img{display:block;width:100%;height:auto}
    .quick-selector-hotspot{position:absolute;z-index:3;min-width:64px;min-height:0;padding:7px 10px;border-radius:999px;transform:translate(-50%,-50%);box-shadow:0 6px 18px rgba(0,0,0,.25);backdrop-filter:blur(8px)}
    .quick-selector-hotspot:hover,.quick-selector-hotspot:focus-visible{transform:translate(-50%,-50%) translateY(-1px)}
    .quick-selector-hotspot.is-active{transform:translate(-50%,-50%)}
    @media(max-width:720px){.quick-selector-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.quick-selector-hotspot{min-width:48px;padding:5px 7px;font-size:.68rem}}
  `;
  document.head.appendChild(style);
}

export function mountQuickSelector({ target, items = [], initialId = null, onSelect = null, renderContent = null, imageTarget = null, positions = null }){
  const root = typeof target === 'string' ? document.querySelector(target) : target;
  if (!root || !Array.isArray(items) || !items.length) return null;
  ensureStyle();

  root.classList.add('quick-selector');
  root.innerHTML = imageTarget ? '<div class="quick-selector-detail" aria-live="polite"></div>' : '<div class="quick-selector-grid" role="tablist"></div><div class="quick-selector-detail" aria-live="polite"></div>';
  const grid = root.querySelector('.quick-selector-grid');
  const detail = root.querySelector('.quick-selector-detail');
  const byId = new Map(items.map(item => [String(item.id), item]));
  let buttonRoot = grid;

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function renderDetail(item){
    const extra = Array.isArray(item.extra) ? item.extra.filter(Boolean).join(' · ') : (item.extra || '');
    detail.innerHTML = `${item.kicker ? `<div class="quick-selector-kicker">${esc(item.kicker)}</div>` : ''}<h3 class="quick-selector-title">${esc(item.title || '')}</h3>${item.description ? `<p class="quick-selector-copy">${esc(item.description)}</p>` : ''}${extra ? `<div class="quick-selector-extra">${esc(extra)}</div>` : ''}<div class="quick-selector-content"></div>${item.href ? `<a class="quick-selector-link" href="${esc(item.href)}">${esc(item.linkLabel || '延伸查看')} →</a>` : ''}`;
    const contentHost = detail.querySelector('.quick-selector-content');
    if (typeof renderContent === 'function' && contentHost) {
      const rendered = renderContent(item, contentHost);
      if (typeof rendered === 'string') contentHost.innerHTML = rendered;
      else if (rendered instanceof Node) contentHost.replaceChildren(rendered);
      if (!contentHost.childNodes.length) contentHost.remove();
    } else {
      contentHost?.remove();
    }
  }

  function select(id){
    const key = String(id);
    const item = byId.get(key);
    if (!item) return;
    buttonRoot?.querySelectorAll('[data-quick-id]').forEach(btn => {
      const active = btn.dataset.quickId === key;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    renderDetail(item);
    if (typeof onSelect === 'function') onSelect(item);
  }

  if (imageTarget) {
    const imageEl = typeof imageTarget === 'string' ? document.querySelector(imageTarget) : imageTarget;
    if (imageEl) {
      const stage = document.createElement('div');
      stage.className = 'quick-selector-image-stage';
      imageEl.parentNode.insertBefore(stage, imageEl);
      stage.appendChild(imageEl);
      buttonRoot = stage;
      const defaultPositions = [[14,18],[38,18],[62,18],[86,18],[14,43],[38,43],[62,43],[86,43]];
      items.forEach((item, index) => {
        const point = positions?.[index] || defaultPositions[index] || [50,50];
        const btn = document.createElement('button');
        btn.className = 'quick-selector-hotspot';
        btn.type = 'button';
        btn.dataset.quickId = String(item.id);
        btn.setAttribute('aria-pressed','false');
        btn.style.left = `${point[0]}%`;
        btn.style.top = `${point[1]}%`;
        btn.textContent = item.label || item.title || item.id;
        stage.appendChild(btn);
      });
    }
  } else if (grid) {
    grid.innerHTML = items.map(item => `<button class="quick-selector-btn" type="button" role="tab" data-quick-id="${esc(item.id)}" aria-selected="false">${esc(item.label || item.title || item.id)}</button>`).join('');
  }

  buttonRoot?.addEventListener('click', event => {
    const btn = event.target.closest('[data-quick-id]');
    if (btn) select(btn.dataset.quickId);
  });

  select(initialId ?? items[0].id);
  return { select, root };
}
