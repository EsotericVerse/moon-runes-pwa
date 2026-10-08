import {test,expect} from '@playwright/test';

test('Four feature page hero frames read one LOC source while LunaRunes stays unchanged',async({page})=>{
  const features=[
    ['culture','文化'],
    ['statics','統計'],
    ['search','搜尋'],
    ['governance','治理']
  ];
  for(const [index,[feature,title]] of features.entries()){
    await page.goto('/'+feature+'/',{waitUntil:'domcontentloaded'});
    const hero=page.locator('header.scope-feature-hero');
    await expect(hero).toHaveAttribute('data-page-name','feature_hero',{timeout:25_000});
    await expect(hero).toHaveAttribute('data-block-order',String(index+1));
    await expect(page.locator('header.scope-feature-hero')).toHaveCount(1);
    await expect(hero.locator('h1')).toHaveText(title);
    await expect(hero.locator('.scope-subtitle')).not.toBeEmpty();
    await expect(hero.locator('.scope-hero-description')).not.toBeEmpty();
    await expect(hero.locator('.scope-hero-description p')).toHaveCount(1);
  }

  // A second managed Scope consumes the same canonical LOC title/description.
  await page.goto('/lo3rwang/search/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('header.scope-feature-hero')).toHaveAttribute('data-feature-hero-source','loc',{timeout:25_000});
  await expect(page.locator('header.scope-feature-hero h1')).toHaveText('搜尋');
  await expect(page.locator('header.scope-feature-hero .scope-subtitle')).toContainText('月典');

  // Rune pages are read-only and retain the current independent UI copy.
  await page.goto('/lrunes/search/',{waitUntil:'domcontentloaded'});
  const runeHero=page.locator('header.scope-feature-hero');
  await expect(runeHero).toHaveAttribute('data-feature-hero-source','default');
  await expect(runeHero.locator('.scope-subtitle')).not.toContainText('月典中的文字');

  // No extraneous detached editor exists on the LOC homepage. Public edits
  // happen only on the actual four feature-page header frames.
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('details.scope-feature-hero-management')).toHaveCount(0);
  await expect(page.locator('.loc-home > section[data-block-order="6"]')).toBeVisible({timeout:25_000});
});
