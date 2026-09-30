import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES=['/','/lrunes/','/culture/','/statics/','/search/','/game/','/lo3rwang/'];

for(const route of ROUTES){
  test(`${route} keeps the RC8.1 visual contract`,async({page})=>{
    await page.goto(route,{waitUntil:'domcontentloaded'});
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.scope-v2-global')).toBeVisible();

    const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
    expect(overflow).toBeLessThanOrEqual(2);

    const main=page.locator('.loc-next-main,.scope-v2-main').first();
    await expect(main).toBeVisible();

    const results=await new AxeBuilder({page})
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])
      .analyze();
    const blocking=results.violations.filter(item=>item.impact==='critical'||item.impact==='serious');
    expect(blocking,JSON.stringify(blocking,null,2)).toEqual([]);
  });
}

test('reduced motion disables decorative progress',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const progress=page.locator('.rc81-scroll-progress');
  await expect(progress).toHaveCSS('display','none');
});
