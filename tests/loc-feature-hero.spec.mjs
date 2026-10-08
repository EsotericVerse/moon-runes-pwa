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
    if(feature==='search')locSearchSubtitle=(await hero.locator('.scope-subtitle').innerText()).trim();
    // Content authors own both description and paragraph structure; only the
    // canonical Hero fields and one-frame presentation are structural.
  }

  // A second managed Scope consumes the same canonical LOC title/description.
  await page.goto('/lo3rwang/search/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('header.scope-feature-hero')).toHaveAttribute('data-feature-hero-source','loc',{timeout:25_000});
  await expect(page.locator('header.scope-feature-hero > .loc-eyebrow')).toHaveText('Search');
  await expect(page.locator('header.scope-feature-hero h1')).toHaveText('搜尋');
  // Subtitle text is authored and editable in the LOC shared source.
  // Test sharing by comparing to LOC's live value, never by pinning its wording.
  await expect(page.locator('header.scope-feature-hero .scope-subtitle')).toHaveText(locSearchSubtitle);

  // Rune pages are read-only and retain the current independent UI copy.
  await page.goto('/lrunes/search/',{waitUntil:'domcontentloaded'});
  const runeHero=page.locator('header.scope-feature-hero');
  await expect(runeHero).toHaveAttribute('data-feature-hero-source','default');
  await expect(runeHero.locator('.scope-subtitle')).not.toContainText('月典中的文字');

  // No extraneous detached editor exists on the LOC homepage. Public edits
  // happen only on the actual four feature-page header frames.
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('details.scope-feature-hero-management')).toHaveCount(0);
  await expect(page.locator('.loc-home > section[data-block-order="6"]')).toBeVisible({timeout:25_000});
});

test('LOC Search shows all-Scope search controls instead of Scope Group guide',async({page})=>{
  await page.goto('/search/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.scope-search-form')).toBeVisible({timeout:25000});
  await expect(page.locator('#scope-search-query')).toBeVisible();
  await expect(page.locator('.scope-tabs button')).toHaveCount(2);
  await expect(page.locator('.scope-group-overview')).toHaveCount(0);
  await expect(page.getByText('請先選擇要搜尋的 Scope',{exact:false})).toHaveCount(0);
});

test('Home Hero and secondary frame titles use independent size tiers',async({page})=>{
  for(const route of ['/','/lo3rwang/']){
    await page.goto(route,{waitUntil:'domcontentloaded'});
    const home=page.locator('.loc-home');
    const hero=home.locator('> .loc-home-block--hero');
    const section=home.locator('> .loc-home-block:not(.loc-home-block--hero)').first();
    await expect(hero.locator('.loc-home-block__header>h1')).toBeVisible({timeout:25000});
    await expect(section.locator('.loc-home-block__header>h2')).toBeVisible();
    const heroPx=await hero.locator('.loc-home-block__header>h1').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
    const sectionPx=await section.locator('.loc-home-block__header>h2').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
    expect(heroPx).toBeGreaterThan(sectionPx);
    expect(sectionPx).toBeGreaterThanOrEqual(22);
    const pageOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(pageOverflow).toBeLessThanOrEqual(2);
  }
});

test('LOC feature Hero titles scale beyond normal cards but preserve Rune settings',async({page})=>{
  await page.goto('/culture/',{waitUntil:'domcontentloaded'});
  const title=page.locator('.scope-feature-hero>.home-title-row>h1');
  await expect(title).toBeVisible({timeout:25000});
  const featurePx=await title.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(featurePx).toBeGreaterThanOrEqual(37);
  await page.goto('/lrunes/culture/',{waitUntil:'domcontentloaded'});
  const rune=page.locator('.scope-feature-hero>.home-title-row>h1');
  await expect(rune).toBeVisible({timeout:25000});
  const runePx=await rune.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(featurePx).toBeGreaterThanOrEqual(runePx);
});
