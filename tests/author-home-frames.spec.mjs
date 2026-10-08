import {test,expect} from '@playwright/test';

test('Author homepage uses the exact LOC frame components and layouts',async({page})=>{
  await page.goto('/lo3rwang/',{waitUntil:'domcontentloaded'});
  const frames=page.locator('.loc-home > section.scope-editable-block');
  await expect(page.locator('.loc-home > section[data-block-order="6"]')).toBeVisible({timeout:25000});
  await expect(frames).toHaveCount(6);
  expect(await frames.evaluateAll(items=>items.map(x=>Number(x.dataset.blockOrder)))).toEqual([1,2,3,4,5,6]);
  const hero=page.locator('.loc-home > section[data-block-order="1"]');
  await expect(hero).toHaveClass(/loc-home-block--hero/);
  await expect(hero.locator(':scope > .loc-home-block__header h1')).toHaveText('政德');
  await expect(hero.locator(':scope > .loc-home-block__media img')).toHaveAttribute('src',/lo3rwang-hero\.[^.]+\.jpg/);
  await expect(hero.locator(':scope > .loc-home-block__media')).toHaveCSS('position','absolute');
  await expect(page.locator('.author-home-hero-copy,.author-trinity-layout,.author-role-grid,.author-system-grid')).toHaveCount(0);
  for(const order of [2,3,4,5,6]){
    const frame=page.locator('.loc-home > section[data-block-order="'+order+'"]');
    await expect(frame.locator(':scope > .loc-home-block__header')).toHaveCount(1);
  }
  await expect(page.locator('.loc-home > section[data-block-order="5"] .loc-home-block__media-bubble img')).toHaveAttribute('src','/pics/lo3rwang-3.png');
  await expect(page.locator('.loc-home > section[data-block-order="5"] .loc-home-block__media-bubble img')).toHaveCount(1);
  await expect(page.locator('.loc-home > section[data-block-order="3"] .loc-home-block__children article')).toHaveCount(5);
  await expect(page.locator('.loc-home > section[data-block-order="6"] a[href^="mailto:"]')).toBeVisible();
  const image=page.locator('.loc-home > section[data-block-order="5"] .loc-home-block__media-bubble');
  const picture=await image.boundingBox();
  const frame=await page.locator('.loc-home > section[data-block-order="5"]').boundingBox();
  expect(picture&&frame).toBeTruthy();
  expect(picture.width).toBeLessThanOrEqual(frame.width);
});
