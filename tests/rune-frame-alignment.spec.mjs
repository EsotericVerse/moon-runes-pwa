import {test,expect} from '@playwright/test';

/* Real browser geometry, not a fake CSS-only selector assertion.
 * Keep the native LOC main/frame layout aligned at desktop and phone widths.
 */
const ROUTES=[
  ['/lrunes/card3d/duel/','3D draw'],
  ['/lrunes/card3d/daily/','3D daily'],
  ['/lrunes/card3d/list/','3D rune atlas'],
  ['/lrunes/duel2/','original-art draw'],
  ['/lrunes/list2/','original-art atlas']
];

for(const [url,name] of ROUTES){
  test(name+' uses original LOC page gutters and ONE complete inner text frame',async({page})=>{
    await page.goto(url,{waitUntil:'domcontentloaded'});
    const main=page.locator('main.loc-next-main').first();
    const panel=main.locator(':scope > .loc-panel.rune-skin-lab');
    await expect(panel).toBeVisible({timeout:25000});
    await expect(panel.locator(':scope > header')).toBeVisible();
    expect(await main.locator(':scope > .loc-panel').count()).toBe(1);

    const nav=page.locator('.scope-global').first();
    await expect(nav).toBeVisible();
    const m=await main.boundingBox();
    const p=await panel.boundingBox();
    const n=await nav.boundingBox();
    expect(m&&p&&n).toBeTruthy();

    // The original LOC outer frame and the native NAV share a center line.
    const center=x=>x.x+x.width/2;
    expect(Math.abs(center(m)-center(n)),name+' NAV/page center mismatch').toBeLessThan(3);
    expect(Math.abs(center(m)-center(p)),name+' text card is not centered').toBeLessThan(3);

    // The frame must never spill beyond its parent, and there must be BOTH
    // left and right margins inside the page, not only a centered strip.
    expect(p.x).toBeGreaterThanOrEqual(m.x-1);
    expect(p.x+p.width).toBeLessThanOrEqual(m.x+m.width+1);
    expect(p.width,name+' collapsed into a central rectangle').toBeGreaterThan(m.width*.95);

    const actual=await panel.evaluate(el=>{
      const css=getComputedStyle(el);
      return {
        border:parseFloat(css.borderTopWidth),
        padding:parseFloat(css.paddingLeft),
        radius:parseFloat(css.borderTopLeftRadius),
        background:css.backgroundImage,
        maxWidth:css.maxWidth,
        boxSizing:css.boxSizing
      };
    });
    expect(actual.border).toBeGreaterThanOrEqual(.9);
    expect(actual.padding).toBeGreaterThanOrEqual(6);
    expect(actual.radius).toBeGreaterThan(9);
    expect(actual.background).not.toBe('none');
    expect(actual.boxSizing).toBe('border-box');
    expect(actual.maxWidth).toBe('none');

    // Verify visually bordered stage/gallery stays entirely within its panel.
    const stage=panel.locator('.rune-3d-stage, .rune-art-stage, .rune-3d-atlas-gallery').first();
    if(await stage.count()){
      const s=await stage.boundingBox();
      if(s){
        expect(s.x).toBeGreaterThanOrEqual(p.x+1);
        expect(s.x+s.width).toBeLessThanOrEqual(p.x+p.width-1);
      }
    }
  });
}
