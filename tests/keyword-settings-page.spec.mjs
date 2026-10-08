import {test,expect} from '@playwright/test';

test('keyword management uses a standalone route and does not eagerly mount a graph',async({page})=>{
  const runtimeErrors=[];
  page.on('pageerror',error=>runtimeErrors.push(error.message));
  const response=await page.goto('/lo3rwang/statics/keywords/',{waitUntil:'domcontentloaded'});
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading',{name:'關鍵詞設定'})).toBeVisible();
  await expect(page.getByRole('link',{name:'返回統計頁'})).toHaveAttribute('href',/\/lo3rwang\/statics\//);
  await expect(page.locator('.scope-keyword-network-canvas')).toHaveCount(0);
  await expect(page.locator('.scope-keyword-network')).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

test('ordinary statistics route must not embed keyword editing or vis-network',async({page})=>{
  await page.goto('/lo3rwang/statics/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.scope-keyword-network-canvas')).toHaveCount(0);
  await expect(page.locator('.scope-management-workspace')).toHaveCount(0);
});
