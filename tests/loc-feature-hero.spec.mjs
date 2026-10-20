import {test,expect} from '@playwright/test';

test('Four feature page hero frames read one LOC source while LunaRunes stays unchanged',async({page})=>{
  let locSearchSubtitle='';
  const features=[
    ['culture','文化','Culture'],
    ['statics','統計','Statistics'],
    ['search','搜尋','Search'],
    ['governance','治理','Governance']
  ];
  for(const [index,[feature,title,english]] of features.entries()){
    await page.goto('/'+feature+'/',{waitUntil:'domcontentloaded'});
    const hero=page.locator('header.scope-feature-hero');
    await expect(hero).toHaveAttribute('data-page-name','feature_hero',{timeout:25_000});
    await expect(hero).toHaveAttribute('data-block-order',String(index+1));
    await expect(page.locator('header.scope-feature-hero')).toHaveCount(1);
    await expect(hero.locator(':scope > .loc-eyebrow')).toHaveText(english);
    await expect(hero.locator('h1')).toHaveText(title);
    // Editable feature subtitles may intentionally be blank. The Search copy
    // is compared to the same authored LOC block when exposed to another Scope.
    if(feature==='search')locSearchSubtitle=(await hero.locator('.scope-subtitle').allTextContents()).join('').trim();
    // Content authors own both description and paragraph structure; only the
    // canonical Hero fields and one-frame presentation are structural.
  }

  // A second managed Scope consumes the same canonical LOC title/description.
  await page.goto('/lo3rwang/search/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('header.scope-feature-hero')).toHaveAttribute('data-feature-hero-source','loc',{timeout:25_000});
  await expect(page.locator('header.scope-feature-hero > .loc-eyebrow')).toHaveText('Search');
  // Subtitle text is authored and editable in the LOC shared source.
  // Test sharing by comparing to LOC's live value, never by pinning its wording.
  const authorSearchSubtitle=(await page.locator('header.scope-feature-hero .scope-subtitle').allTextContents()).join('').trim();
  expect(authorSearchSubtitle).toBe(locSearchSubtitle);

  // Rune pages are read-only and retain the current independent UI copy.
  await page.goto('/lrunes/search/',{waitUntil:'domcontentloaded'});
  const runeHero=page.locator('header.scope-feature-hero');
  await expect(runeHero).toHaveAttribute('data-feature-hero-source','default');
  await expect(runeHero.locator('.scope-subtitle')).not.toContainText('月典中的文字');

  // No extraneous detached editor exists on the LOC homepage. Public edits
  // happen only on the actual four feature-page header frames.
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('details.scope-feature-hero-management')).toHaveCount(0);
  await expect(page.locator('.loc-home > section[data-block-order="5"]')).toBeVisible({timeout:25_000});
});

test('LOC Search shows all-Scope search controls instead of Scope Group guide',async({page})=>{
  await page.goto('/search/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.scope-search-form')).toBeVisible({timeout:25000});
  await expect(page.locator('#scope-search-query')).toBeVisible();
  // Search uses one unified query form with three on-demand advanced filters.
  const advanced=page.locator('.scope-search-advanced-toggle');
  await expect(advanced).toHaveAttribute('aria-expanded','false');
  await advanced.click();
  await expect(advanced).toHaveAttribute('aria-expanded','true');
  const tabs=page.locator('.scope-search-filter-tabs button[role="tab"]');
  await expect(tabs).toHaveCount(3);
  await expect(page.locator('#scope-search-content-type')).toBeVisible();
  await tabs.nth(1).click();
  await expect(page.locator('#scope-search-source')).toBeVisible();
  await tabs.nth(2).click();
  await expect(page.locator('#scope-search-start-date')).toBeVisible();
  await expect(page.locator('#scope-search-end-date')).toBeVisible();
  await advanced.click();
  await expect(advanced).toHaveAttribute('aria-expanded','false');
  await expect(tabs).toHaveCount(0);
  await expect(page.locator('.scope-group-overview')).toHaveCount(0);
  await expect(page.getByText('請先選擇要搜尋的 Scope',{exact:false})).toHaveCount(0);
});

// Independent per-Scope tests: a dozen DB-hydrated page loads and image
// decodes cannot share Playwright's 45s per-test budget.
const featureArtwork=[['culture','culture'],['statics','statics'],['search','search'],['governance','gn']];
for(const {prefix,filename,mark} of [
  {prefix:'',filename:'LOC',mark:'codex'},
  {prefix:'/lo3rwang',filename:'scope',mark:'anchor'},
  {prefix:'/lrunes',filename:'scope',mark:'moon'}
]){
  test('Four feature JPGs match the '+(prefix||'LOC')+' Scope identity, title and artwork',async({page})=>{
    for(const [feature,asset] of featureArtwork){
      await page.goto(prefix+'/'+feature+'/',{waitUntil:'domcontentloaded'});
      const hero=page.locator('header.scope-feature-hero');
      await expect(hero).toBeVisible({timeout:25_000});
      await expect(hero).toHaveClass(new RegExp('scope-feature-hero--'+feature));
      // Scope identity is loaded asynchronously from silver.scope_registry.
      // Await the actual sign; no text, images, or accessibility checks are skipped.
      await expect(hero.locator(':scope > .home-hero-identity--'+mark)).toHaveCount(1);
      const readImageUrl=()=>hero.evaluate(el=>{
        const background=getComputedStyle(el).backgroundImage;
        return background.match(/url\(["']?([^"')]+)["']?\)/)?.[1]||'';
      });
      // The Scope (and so which artwork variable applies) resolves after hydration.
      // The URL can read empty for a frame while the Hero re-renders; keep the
      // last settled value rather than sampling twice.
      let imageUrl='';
      await expect.poll(async()=>{imageUrl=await readImageUrl();return imageUrl;},{timeout:15_000})
        .toMatch(new RegExp(filename+'-'+asset+'[^/]*\\.jpg$'));
      const loaded=await page.evaluate(async url=>{
        const img=new Image();
        img.src=url;
        try{await img.decode()}catch{return false}
        return img.naturalWidth>0&&img.naturalHeight>0;
      },imageUrl);
      expect(loaded).toBe(true);
      const heroTitle=hero.locator('.home-title-row>h1');
      await expect(heroTitle).toBeVisible();
      await expect(heroTitle).toHaveCSS('color','rgb(247, 248, 255)');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(2);
    }
  });
}

test('Search does not show an empty title-only suggestions card to visitors',async({page})=>{
  await page.goto('/search/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.scope-search-form')).toBeVisible({timeout:25_000});
  const emptyCards=await page.locator('.scope-search-reference-block:not(.is-editing)').evaluateAll(cards=>cards.filter(card=>
    ![...card.querySelectorAll('.scope-block-subtitle,.scope-rich-surface,.scope-block-entity-grid article')]
      .some(item=>item.textContent.trim().length>0)
  ).length);
  expect(emptyCards).toBe(0);
});
