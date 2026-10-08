import {test,expect} from '@playwright/test';

test('LOC index home frames are rendered once, in database order, with authored rich HTML',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const frames=page.locator('.loc-home > section.scope-editable-block');
  const hero=page.locator('.loc-home > section[data-page-name="index"][data-block-order="1"]');
  await expect(hero).toBeVisible();
  await expect(hero.locator('picture img')).toHaveAttribute('src',/LOC-PicAll\.[^.]+\.png/);
  await expect(hero.locator('picture source')).toHaveAttribute('srcSet',/LOC-PicAll_s\.[^.]+\.png/);

  // The shared visual-card rule must not push the Hero image into text flow.
  const heroArtwork=hero.locator('.home-hero-visual');
  await expect(heroArtwork).toHaveCSS('position','absolute');
  const [frame,artwork]=await Promise.all([hero.boundingBox(),heroArtwork.boundingBox()]);
  expect(frame).not.toBeNull();
  expect(artwork).not.toBeNull();
  expect(Math.abs(frame.x-artwork.x)).toBeLessThan(4);
  expect(Math.abs(frame.y-artwork.y)).toBeLessThan(4);
  expect(Math.abs(frame.width-artwork.width)).toBeLessThan(4);
  expect(Math.abs(frame.height-artwork.height)).toBeLessThan(4);

  // Current public index has six blocks. Wait for DB hydration instead of
  // mistaking the SSR Hero placeholder for a complete database render.
  await expect(page.locator('.loc-home > section[data-block-order="6"]')).toBeVisible({timeout:20_000});
  const orders=await frames.evaluateAll(items=>items.map(item=>Number(item.dataset.blockOrder)));
  expect(orders.length).toBeLessThanOrEqual(8);
  expect(orders).toEqual([...orders].sort((a,b)=>a-b));
  expect(new Set(orders).size).toBe(orders.length);
  expect(orders).toEqual([1,2,3,4,5,6]);
  expect(await page.locator('.loc-home .scope-editable-block-grid').count()).toBe(0);
  expect(await page.locator('.loc-home .scope-editable-block .scope-editable-block').count()).toBe(0);

  // Existing artwork is a contained image-only bubble, not a second
  // background. Its placement must adapt without crowding the text.
  const viewport=page.viewportSize();
  for(const order of [2,3,6]){
    const frame=page.locator('.loc-home > section[data-block-order="'+order+'"]');
    const picture=frame.locator(':scope > .loc-home-block__media-bubble');
    await expect(picture).toHaveCount(1);
    await expect(picture.locator('img')).toHaveCount(1);
    const [frameBox,headerBox,mediaBox]=await Promise.all([
      frame.boundingBox(),frame.locator(':scope > .loc-home-block__header').boundingBox(),picture.boundingBox()
    ]);
    expect(frameBox&&headerBox&&mediaBox).toBeTruthy();
    expect(mediaBox.width).toBeLessThanOrEqual(frameBox.width);
    if(viewport.width<=760){
      expect(mediaBox.y).toBeGreaterThanOrEqual(headerBox.y);
    }else{
      expect(mediaBox.x).toBeGreaterThan(headerBox.x);
    }
  }

  const status=page.locator('.loc-home > section[data-block-order="4"]');
  await expect(status.locator('.loc-home-block__body')).toContainText('目前文字作品');
  await expect(status.locator('.loc-home-block__body')).toContainText('系統架構');
  await expect(status.locator('.loc-home-block__children > article')).toHaveCount(3);
  const strong=await status.locator('.loc-home-block__body strong').first().evaluate(node=>Number.parseInt(getComputedStyle(node).fontWeight,10));
  expect(strong).toBeGreaterThanOrEqual(600);

  const skills=page.locator('.loc-home > section[data-block-order="5"]');
  await expect(skills.locator('.loc-home-block__children > article')).toHaveCount(3);
  await expect(skills.locator('a[href*="LOC-GPT-Skills-v2.0-bundle.zip"]')).toBeVisible();
});
