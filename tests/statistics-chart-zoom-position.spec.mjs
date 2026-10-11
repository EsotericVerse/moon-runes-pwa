import {test,expect} from '@playwright/test';

// The user's +/- zoom controls belong to the chart itself, not to the
// selectors for statistical dimensions, chart types, or personal sources.
test('LOC +/- is on the right side of the plot, not in options toolbar',async({page})=>{
  await page.goto('/statics/',{waitUntil:'domcontentloaded'});
  const plot=page.locator('.scope-stat-chart-frame').first();
  const canvas=plot.locator('.scope-stat-chart-frame__canvas');
  const zoom=plot.locator('.scope-stat-zoom-rail');
  const plus=page.locator('#loc-stat-zoom-in');
  const minus=page.locator('#loc-stat-zoom-out');
  await expect(plot).toBeVisible({timeout:25_000});
  await expect(zoom).toBeVisible();
  await expect(plus).toBeVisible();
  await expect(minus).toBeVisible();
  await expect(plus).toHaveText('＋');
  await expect(minus).toHaveText('－');
  await expect(page.locator('.scope-stat-controls #loc-stat-zoom-in')).toHaveCount(0);
  await expect(page.locator('.scope-stat-controls #loc-stat-zoom-out')).toHaveCount(0);
  await expect(page.locator('.scope-stat-chart-frame #loc-stat-zoom-out')).toHaveCount(1);
  const location=await plot.evaluate(frame=>{
    const canvas=frame.querySelector('.scope-stat-chart-frame__canvas').getBoundingClientRect();
    const rail=frame.querySelector('.scope-stat-zoom-rail').getBoundingClientRect();
    return {canvasLeft:canvas.left,canvasRight:canvas.right,canvasWidth:canvas.width,
      railLeft:rail.left,railRight:rail.right,railHeight:rail.height};
  });
  expect(location.canvasWidth).toBeGreaterThan(150);
  expect(location.railLeft).toBeGreaterThanOrEqual(location.canvasRight-1);
  expect(location.railRight).toBeGreaterThan(location.railLeft);
  expect(location.railHeight).toBeGreaterThanOrEqual(85);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
