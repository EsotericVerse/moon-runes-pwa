export function mountQuickSelector({ target, items = [], initialId = null, onSelect = null, renderContent = null, imageTarget = null, positions = null, display = 'inline' }){
  const root = typeof target === 'string' ? document.querySelector(target) : target;
  if (!root || !Array.isArray(items) || !items.length) return null;

  const modalMode = display === 'modal';
  root.classList.add('quick-selector');
  if (modalMode) root.classList.add('quick-selector-overlay-only');
  root.innerHTML = modalMode ? '' : (imageTarget ? '<div class="quick-selector-detail" aria-live="polite"></div>' : '<div class="quick-selector-grid" role="tablist"></div><div class="quick-selector-detail" aria-live="polite"></div>');

  let modal = null;
  let detail = root.querySelector('.quick-selector-detail');
  if (modalMode) {
    modal = document.createElement('dialog');
    modal.className = 'quick-selector-modal';
    modal.innerHTML = '<div class="quick-selector-modal-shell"><button class="quick-selector-modal-close" type="button" aria-label="關閉">×</button><div class="quick-selector-detail" aria-live="polite"></div></div>';
    document.body.appendChild(modal);
    detail = modal.querySelector('.quick-selector-detail');
    modal.querySelector('.quick-selector-modal-close')?.addEventListener('click', () => modal.close());
    modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
  }

  const grid = root.querySelector('.quick-selector-grid');
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

  function select(id, openModal = true){
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
    if (modalMode && openModal && modal && !modal.open) modal.showModal();
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
        btn.dataset.quickX = String(point[0]);
        btn.dataset.quickY = String(point[1]);
        btn.setAttribute('aria-pressed','false');
        btn.textContent = item.label || item.title || item.id;
        stage.appendChild(btn);
      });
    }
  } else if (grid) {
    grid.innerHTML = items.map(item => `<button class="quick-selector-btn" type="button" role="tab" data-quick-id="${esc(item.id)}" aria-selected="false">${esc(item.label || item.title || item.id)}</button>`).join('');
  }

  buttonRoot?.addEventListener('click', event => {
    const btn = event.target.closest('[data-quick-id]');
    if (btn) select(btn.dataset.quickId, true);
  });

  select(initialId ?? items[0].id, false);
  return { select, root, modal };
}
