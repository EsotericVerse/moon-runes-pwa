import {test,expect} from '@playwright/test';

test('mobile statistics uses responsive native controls without engineering prose',async({page})=>{
  await page.goto('/lo3rwang/statics/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.scope-global')).toBeVisible();
  await expect(page.locator('.scope-feature-dock a')).toHaveCount(6);
  await expect(page.locator('body')).not.toContainText('只分析目前 Scope');
  await expect(page.locator('body')).not.toContainText('以每日符文實際抽取紀錄為基準');
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
  expect(overflow).toBeLessThanOrEqual(2);
  const controls=page.locator('.scope-stat-controls select.scope-select');
  if(await controls.count()){
    await controls.first().focus();
    await expect(controls.first()).toBeFocused();
  }
});

test('mobile feature navigation responds to a touch tap',async({page})=>{
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
