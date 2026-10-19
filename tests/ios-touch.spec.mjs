import {test,expect} from '@playwright/test';

test('mobile statistics uses responsive native controls without engineering prose',async({page})=>{
  await page.goto('/lo3rwang/statics/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.scope-global')).toBeVisible();
  await expect(page.locator('.scope-feature-dock a')).toHaveCount(6);
  await expect(page.locator('body')).not.toContainText('只分析目前 Scope');
  await expect(page.locator('body')).not.toContainText('以每日符文實際抽取紀錄為基準');
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
  expect(overflow).toBeLessThanOrEqual(2);
  const controls=page.locator('.scope-stat-controls select.scope-select:visible');
  if(await controls.count()){
    await expect(controls.first()).toBeVisible();
    await expect(controls.first()).toBeEnabled();
    const initial=await controls.first().inputValue();
    await controls.first().selectOption(initial);
    await expect(controls.first()).toHaveValue(initial);
  }
});

test('mobile feature navigation responds to a touch tap',async({page,isMobile})=>{
  test.skip(!isMobile,'Requires a touch-enabled mobile browser');
  await page.goto('/lo3rwang/statics/',{waitUntil:'domcontentloaded'});
  const link=page.locator('.scope-feature-dock a[href*="/culture/"]').first();
  await expect(link).toBeVisible();
  await link.tap();
  await expect(page).toHaveURL(/\/culture\//);
  const timeline=page.locator('.scope-timeline-controls');
  if(await timeline.isVisible()){
    const zoom=timeline.getByRole('button',{name:'放大時間長河'});
    if(await zoom.isEnabled())await zoom.tap();
  }
});

test('iOS WebKit draws show a recognized real Taipei moon phase',async({page,browserName})=>{
  test.skip(browserName!=='webkit','iOS-specific Intl Chinese calendar coverage');
  await page.goto('/duel/daily/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('body')).toContainText(
    /真實月相[：:]\s*(?:新月|上弦|滿月|下弦|空亡)/,
    {timeout:15_000}
  );
  await expect(page.locator('body')).not.toContainText('真實月相無法辨識');
});

test('mobile deep-feature dock and rune return link',async({page})=>{
  await page.goto('/lo3rwang/statics/keywords/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.scope-feature-dock a[href*="/statics/"]')).toHaveAttribute('aria-current','page');
  await page.goto('/lrunes/list/',{waitUntil:'domcontentloaded'});
  const back=page.getByRole('link',{name:/回符文首頁/}).first();
  await expect(back).toBeVisible();
  await expect(back).toHaveAttribute('href',/^(?:https:\/\/lrunes\.lo3rwang\.cc\/|https:\/\/loc\.lo3rwang\.cc\/lrunes\/|\/lrunes\/index\.html)$/);
});

test('mobile task pages expose the task quickly without oversized hero artwork',async({page,isMobile})=>{
  test.skip(!isMobile,'Mobile layout contract');
  for(const route of ['/search/','/statics/','/culture/']){
    await page.goto(route,{waitUntil:'domcontentloaded'});
    const hero=page.locator('.scope-feature-hero--artwork').first();
    await expect(hero).toBeVisible({timeout:25_000});
    const size=await hero.boundingBox();
    // Keep authored text readable: Culture naturally needs slightly more room.
    expect(size.height,route+' hero should leave first-screen space for work').toBeLessThanOrEqual(280);
    const content=await page.locator('.scope-content').first().boundingBox();
    expect(content.y,route+' controls should start within the first screen').toBeLessThan(page.viewportSize().height*.67);
  }
});

test('footer keeps data source metadata on demand and failover warnings visible',async({page})=>{
  await page.goto('/settings/',{waitUntil:'domcontentloaded'});
  const source=page.locator('.scope-data-source-global');
  const disclosure=source.locator('.scope-data-source-details');
  await expect(disclosure.locator('summary')).toBeVisible();
  const degraded=await source.evaluate(element=>element.classList.contains('is-backup'));
  if(!degraded)await expect(disclosure).not.toHaveAttribute('open');
  await disclosure.locator('summary').click();
  await expect(disclosure).toHaveAttribute('open');
  await expect(disclosure.locator('.scope-data-source-values')).toBeVisible();
  await expect(disclosure.locator('.scope-data-source-values>span')).toHaveCount(3);
});

test('mobile daily rune calendar dates meet comfortable touch target height',async({page,isMobile})=>{
  test.skip(!isMobile,'Mobile touch target contract');
  await page.goto('/lrunes/daily/log/',{waitUntil:'domcontentloaded'});
  const dates=page.locator('.daily-log-calendar .scope-daily-calendar-cell');
  await expect(dates.first()).toBeVisible();
  const rect=await dates.first().boundingBox();
  expect(rect.height).toBeGreaterThanOrEqual(44);
  await dates.first().tap();
  await expect(dates.first()).toHaveAttribute('aria-pressed','true');
});
