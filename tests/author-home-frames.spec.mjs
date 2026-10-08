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
  // Editable author content can gain or lose child items; only the canonical
  // one-to-six entity limit is structural. Do not freeze the author's copy count.
  const authorFrameEntities=page.locator('.loc-home > section[data-block-order="3"] .loc-home-block__children article');
  await expect(authorFrameEntities.first()).toBeVisible();
  const entityCount=await authorFrameEntities.count();
  expect(entityCount).toBeGreaterThanOrEqual(1);
  expect(entityCount).toBeLessThanOrEqual(6);
  await expect(page.locator('.loc-home > section[data-block-order="6"] a[href^="mailto:"]')).toBeVisible();
  const image=page.locator('.loc-home > section[data-block-order="5"] .loc-home-block__media-bubble');
  const picture=await image.boundingBox();
  const frame=await page.locator('.loc-home > section[data-block-order="5"]').boundingBox();
  expect(picture&&frame).toBeTruthy();
  expect(picture.width).toBeLessThanOrEqual(frame.width);
});


test('LOC and Author Heros share a 16:9 cover frame while keeping author overlay readable',async({page})=>{
  const viewport=page.viewportSize();
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const locHero=page.locator('.loc-home > section[data-block-order="1"]');
  await expect(locHero).toBeVisible();
  await expect(locHero.locator('.loc-home-block__media img')).toHaveAttribute('src',/LOC-PicAll/);
  const locMinHeight=await locHero.evaluate(el=>Number.parseFloat(getComputedStyle(el).minHeight));
  const locHeroSize=await locHero.boundingBox();
  expect(locHeroSize).not.toBeNull();
  await expect(locHero).toHaveCSS('aspect-ratio',viewport.width>760?'16 / 9':'auto');
  if(viewport.width>760){
    await expect(locHero).toHaveCSS('display','grid');
    await expect(locHero).toHaveCSS('align-content','center');
    await expect(locHero).toHaveCSS('grid-template-columns',/^[0-9.]+px$/);
  }else{
    await expect(locHero).toHaveCSS('display','block');
  }
  if(viewport.width>760){
    expect(locHeroSize.height).toBeGreaterThanOrEqual(locHeroSize.width*9/16-2);
    // LOC must gain a widescreen editorial frame instead of its former
    // 360–540px-only height cap, without enlarging or distorting its asset.
  }

  await page.goto('/lo3rwang/',{waitUntil:'domcontentloaded'});
  const authorHero=page.locator('.loc-home > section[data-block-order="1"]');
  await expect(authorHero).toBeVisible();
  const authorImage=authorHero.locator(':scope > .loc-home-block__media img');
  await expect(authorImage).toHaveAttribute('src',/lo3rwang-hero\.[^.]+\.jpg/);
  await expect(authorImage).toHaveCSS('object-fit','cover');
  // Detect a missing image asset: a black hero background is not valid artwork.
  await expect.poll(()=>authorImage.evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);
  await expect(authorImage).toHaveCSS('filter','none');
  await expect(authorImage).toHaveCSS('mask-image','none');
  await expect(authorHero).toHaveCSS('display','grid');
  await expect(authorHero).toHaveCSS('aspect-ratio',viewport.width>760?'16 / 9':'auto');

  const authorSize=await authorHero.boundingBox();
  expect(authorSize).not.toBeNull();

  const desktop=viewport.width>760;
  const expectedMinHeight=desktop
    ?Math.min(620,Math.max(430,viewport.width*.5))
    :Math.min(570,Math.max(460,viewport.width*1.18));
  const actualMinHeight=await authorHero.evaluate(el=>Number.parseFloat(getComputedStyle(el).minHeight));
  expect(Math.abs(actualMinHeight-expectedMinHeight)).toBeLessThan(2);
  expect(actualMinHeight).toBeGreaterThan(locMinHeight+25);
  expect(authorSize.height).toBeGreaterThanOrEqual(actualMinHeight-2);
  if(desktop){
    expect(authorSize.height).toBeGreaterThanOrEqual(authorSize.width*9/16-2);
  }
  await expect(authorImage).toHaveCSS('object-position',desktop?'50% 50%':'58% 50%');
  const overlay=await authorHero.locator(':scope > .loc-home-block__media')
    .evaluate(el=>getComputedStyle(el,'::after').backgroundImage);
  expect(overlay).toContain('linear-gradient(');
  // Inspect the actual computed gradient: browser serializers may use 0.9
  // instead of 0.90. The author image must not be covered by near-black.
  const overlayAlpha=[...overlay.matchAll(/rgba\(3,\s*6,\s*13,\s*([\d.]+)\)/g)].map(match=>Number(match[1]));
  expect(overlayAlpha.length).toBeGreaterThan(0);
  expect(Math.max(...overlayAlpha)).toBeLessThanOrEqual(.70);

  // Both pages still have the same DOM contract and one image in Hero.
  await expect(authorHero.locator(':scope > .loc-home-block__media img')).toHaveCount(1);
  await expect(authorHero.locator(':scope > .loc-home-block__header')).toHaveCount(1);
});
