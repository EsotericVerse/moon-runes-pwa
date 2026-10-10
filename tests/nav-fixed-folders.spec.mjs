import {test,expect} from '@playwright/test';

for(const route of ['/','/lrunes/','/lo3rwang/']){
  test('fixed first-row NAV has pinned LOC return and the independent six-key dock on '+route,async({page})=>{
    await page.goto(route,{waitUntil:'domcontentloaded'});
    const nav=page.locator('.scope-global .scope-nav');
    await expect(nav).toBeVisible();
    await expect(page.locator('.scope-global')).toHaveCSS('position','static');
    await expect(page.locator('.scope-feature-dock')).toHaveCSS('position','fixed');
    await expect(nav.getByText('我的最愛',{exact:true})).toHaveCount(0);
    await expect(page.locator('.scope-nav-loc-home')).toHaveText('回月典首頁');
    await expect(page.locator('.scope-nav-loc-home')).toBeVisible();
    await expect(page.locator('.scope-feature-dock a')).toHaveCount(6);
    const sizes=await nav.evaluate(el=>{
      const rail=el.querySelector('.scope-nav-rail').getBoundingClientRect();
      const back=el.querySelector('.scope-nav-loc-home').getBoundingClientRect();
      const header=el.closest('header').getBoundingClientRect();
      const frame=getComputedStyle(el);
      return {railRight:rail.right,homeLeft:back.left,shadow:frame.boxShadow,radius:frame.borderRadius,headerLeft:header.left};
    });
    expect(sizes.railRight).toBeLessThanOrEqual(sizes.homeLeft+1);
    expect(sizes.shadow).toBe('none');
    expect(sizes.radius).toBe('0px');
    const bounds=await page.evaluate(()=>{
      const nav=document.querySelector('.scope-global').getBoundingClientRect();
      const content=document.querySelector('.loc-next-main, .scope-main').getBoundingClientRect();
      return {navLeft:nav.left,navRight:nav.right,contentLeft:content.left,contentRight:content.right,viewport:innerWidth};
    });
    expect(Math.abs(bounds.navLeft-bounds.contentLeft)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds.navRight-bounds.contentRight)).toBeLessThanOrEqual(1);
    expect(bounds.navLeft).toBeGreaterThanOrEqual(6);
    expect(bounds.navRight).toBeLessThanOrEqual(bounds.viewport-6);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });
}

test('top NAV leaves viewport on page scroll while six-button dock remains fixed',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const header=page.locator('.scope-global');
  const dock=page.locator('.scope-feature-dock');
  await expect(header).toHaveCSS('position','static');
  await expect(dock).toHaveCSS('position','fixed');
  await page.evaluate(()=>window.scrollTo(0,360));
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(100);
  const top=await header.evaluate(node=>node.getBoundingClientRect().top);
  expect(top).toBeLessThan(-30);
  await expect(dock).toBeInViewport();
});

test('mobile tap hit targets reach the settings route without a covering layer',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium','Mobile touch simulation only; physical WKWebView remains to be tested');
  await page.goto('/lrunes/',{waitUntil:'domcontentloaded'});
  const tab=page.locator('.scope-feature-dock a[href="/settings/"]');
  await expect(tab).toBeVisible();
  const hit=await tab.evaluate(anchor=>{
    const box=anchor.getBoundingClientRect();
    const under=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);
    return Boolean(under&&(anchor===under||anchor.contains(under)));
  });
  expect(hit).toBe(true);
  await tab.tap();
  await expect(page).toHaveURL(/\/settings\/?$/);
  await expect(page.getByRole('heading',{name:'設定',exact:true}).first()).toBeVisible();
});
