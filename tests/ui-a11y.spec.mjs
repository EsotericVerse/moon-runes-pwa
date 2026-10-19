import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Representative pages across shared templates and distinct Scope experiences.
const ROUTES=[
  '/','/culture/','/statics/','/search/','/game/','/governance/','/settings/',
  '/lo3rwang/','/lo3rwang/culture/','/lo3rwang/statics/','/lo3rwang/search/',
  '/lrunes/','/lrunes/culture/','/lrunes/statics/','/lrunes/search/','/lrunes/game/',
  '/lrunes/daily/log/','/lrunes/daily/trend/','/lrunes/card/','/lrunes/card3d/',
  '/lrunes/list/','/admin/'
];

for(const route of ROUTES){
  test(`${route} keeps the Current visual contract`,async({page},testInfo)=>{
    await page.goto(route,{waitUntil:'domcontentloaded'});
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.scope-global')).toBeVisible();

    const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
    expect(overflow).toBeLessThanOrEqual(2);

    const main=page.locator('main,.loc-next-main,.scope-main').first();
    await expect(main).toBeVisible();

    await page.screenshot({
      path:testInfo.outputPath('full-page.png'),
      fullPage:true,
      animations:'disabled'
    });

    const results=await new AxeBuilder({page})
      .exclude('.scope-home-hero-visual iframe')
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])
      .analyze();
    const blocking=results.violations.filter(item=>item.impact==='critical'||item.impact==='serious');
    expect(blocking,JSON.stringify(blocking,null,2)).toEqual([]);
  });
}

test('reduced motion disables decorative progress',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const progress=page.locator('.loc-scroll-progress');
  await expect(progress).toHaveCSS('display','none');
});
