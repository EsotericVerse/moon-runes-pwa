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
  await expect(page.locator('header.scope-feature-hero h1')).toHaveText('搜尋');
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

test('LOC, Author and LunaRunes share home typography tiers without changing Rune layout',async({page})=>{
  const homeSizes=[];
  for(const path of ['/','/lo3rwang/']){
    await page.goto(path,{waitUntil:'domcontentloaded'});
    const heroTitle=page.locator('.loc-home>.loc-home-block--hero>.loc-home-block__header>h1');
    const sectionTitle=page.locator('.loc-home>.loc-home-block:not(.loc-home-block--hero) .loc-home-block__header>h2').first();
    await expect(heroTitle).toBeVisible({timeout:25000});
    await expect(sectionTitle).toBeVisible();
    homeSizes.push({
      hero:await heroTitle.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)),
      section:await sectionTitle.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))
    });
  }
  await page.goto('/lrunes/',{waitUntil:'domcontentloaded'});
  const runeHero=page.locator('.runes-home-hero');
  const runeTitle=runeHero.locator('.runes-home-hero-copy h1');
  const runeSubtitle=runeHero.locator('.runes-home-hero-copy .home-title-row>.loc-subtitle');
  await expect(runeTitle).toHaveText('月之符文');
  await expect(runeSubtitle).toBeVisible();
  const runeHeroSize=await runeTitle.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  const runeSubtitleSize=await runeSubtitle.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  const runeSectionTitles=[
    page.locator('.runes-home-intro .home-section-heading>h2'),
    page.locator('.runes-reading-flow>h2'),
    page.locator('.runes-custom-draw-section>h2'),
    page.locator('.runes-review-section .home-section-heading>h2')
  ];
  const runeSectionSizes=[];
  for(const heading of runeSectionTitles){
    await expect(heading).toBeVisible();
    runeSectionSizes.push(await heading.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)));
  }
  for(const item of homeSizes){
    expect(Math.abs(item.hero-runeHeroSize)).toBeLessThanOrEqual(1);
    for(const size of runeSectionSizes)expect(Math.abs(item.section-size)).toBeLessThanOrEqual(1);
    expect(item.hero).toBeGreaterThan(item.section);
  }
  expect(runeSubtitleSize).toBeGreaterThanOrEqual(18);
  await expect(runeHero.locator('.runes-home-hero-image')).toBeVisible();
  await expect(page.getByRole('link',{name:'抽一張符文'})).toBeVisible();
  await expect(page.getByRole('link',{name:'每日符文',exact:true})).toBeVisible();
  await expect(page.locator('.runes-home-intro .home-rune-preview')).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('Each homepage Hero has exactly its fixed Scope identity above overlays',async({page})=>{
  const entries=[
    {path:'/',mark:'codex',label:'Codex X',visible:'X'},
    {path:'/lo3rwang/',mark:'anchor',label:'光之定錨點',visible:'光之定錨點'},
    {path:'/lrunes/',mark:'moon',label:'玄韻家黃色圓點標誌',visible:''}
  ];
  for(const entry of entries){
    await page.goto(entry.path,{waitUntil:'domcontentloaded'});
    const hero=entry.mark==='moon'
      ?page.locator('.runes-home-hero')
      :page.locator('.loc-home>.loc-home-block--hero');
    await expect(hero).toBeVisible({timeout:25000});
    const mark=hero.locator(':scope > .home-hero-identity');
    await expect(mark).toHaveCount(1);
    await expect(mark).toHaveClass(new RegExp('home-hero-identity--'+entry.mark+'(?:\\s|$)'));
    await expect(mark).toHaveAttribute('role','img');
    await expect(mark).toHaveAttribute('aria-label',entry.label);
    await expect(mark).toHaveText(entry.visible);
    await expect(mark).toHaveCSS('position','absolute');
    await expect(mark).toHaveCSS('pointer-events','none');
    const zIndex=await mark.evaluate(element=>Number(getComputedStyle(element).zIndex));
    expect(zIndex).toBeGreaterThanOrEqual(3);
    const heroBox=await hero.boundingBox();
    const markBox=await mark.boundingBox();
    expect(heroBox&&markBox).toBeTruthy();
    expect(markBox.x).toBeGreaterThanOrEqual(heroBox.x-2);
    expect(markBox.y).toBeGreaterThanOrEqual(heroBox.y-2);
    expect(markBox.x+markBox.width).toBeLessThanOrEqual(heroBox.x+heroBox.width+2);
    expect(markBox.y+markBox.height).toBeLessThanOrEqual(heroBox.y+heroBox.height+2);
    if(entry.mark!=='codex'){
      const dot=await mark.evaluate(el=>getComputedStyle(el,'::before'));
      expect(dot).toBeTruthy();
      const dotSize=await mark.evaluate(el=>parseFloat(getComputedStyle(el,'::before').width));
      expect(dotSize).toBeGreaterThanOrEqual(12);
    }
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    await expect(page.locator('.home-hero-identity')).toHaveCount(1);
  }
  // The same fixed identity now accompanies the artwork on each feature Hero.
  await page.goto('/culture/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('header.scope-feature-hero>.home-hero-identity--codex')).toHaveText('X');
});

test('Eight feature JPGs map by Scope while keeping the same title and readable Hero',async({page})=>{
  const featureImages=[
    ['culture','culture'],
    ['statics','statics'],
    ['search','search'],
    ['governance','gn']
  ];
  const scopes=[
    {prefix:'',filename:'LOC',mark:'codex'},
    {prefix:'/lo3rwang',filename:'scope',mark:'anchor'},
    {prefix:'/lrunes',filename:'scope',mark:'moon'}
  ];
  for(const {prefix,filename,mark} of scopes){
    for(const [feature,asset] of featureImages){
      await page.goto(prefix+'/'+feature+'/',{waitUntil:'domcontentloaded'});
      const hero=page.locator('header.scope-feature-hero');
      await expect(hero).toBeVisible({timeout:25000});
      await expect(hero).toHaveClass(new RegExp('scope-feature-hero--'+feature));
      await expect(hero.locator(':scope > .home-hero-identity--'+mark)).toHaveCount(1);
      const imageUrl=await hero.evaluate(el=>{
        const background=getComputedStyle(el).backgroundImage;
        return background.match(/url\(["']?([^"')]+)["']?\)/)?.[1]||'';
      });
      expect(imageUrl).toContain(filename+'-'+asset);
      expect(imageUrl).toMatch(/\.jpg$/);
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
  }
});

test('LOC and Author feature Hero text is vertically centered in its artwork frame',async({page})=>{
  for(const prefix of ['', '/lo3rwang']){
    for(const feature of ['culture','statics','search','governance']){
      await page.goto(prefix+'/'+feature+'/',{waitUntil:'domcontentloaded'});
      const hero=page.locator('header.scope-feature-hero--artwork');
      await expect(hero.locator('.home-title-row>h1')).toBeVisible({timeout:25_000});
      await expect(hero).toHaveCSS('display','flex');
      await expect(hero).toHaveCSS('flex-direction','column');
      await expect(hero).toHaveCSS('justify-content','center');
      const offset=await hero.evaluate(el=>{
        const heroBounds=el.getBoundingClientRect();
        const visibleText=[...el.querySelectorAll(':scope > .loc-eyebrow, :scope > .home-title-row, :scope > .scope-hero-description')]
          .map(node=>node.getBoundingClientRect())
          .filter(rect=>rect.height>0);
        if(!visibleText.length)return Number.POSITIVE_INFINITY;
        const visualCenter=(visibleText[0].top+visibleText[visibleText.length-1].bottom)/2;
        return Math.abs(visualCenter-(heroBounds.top+heroBounds.bottom)/2);
      });
      expect(offset).toBeLessThanOrEqual(32);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(2);
    }
  }
  // LunaRunes is already positioned correctly; no shared centering override.
  await page.goto('/lrunes/culture/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('header.scope-feature-hero--artwork')).not.toHaveCSS('display','flex');
});
