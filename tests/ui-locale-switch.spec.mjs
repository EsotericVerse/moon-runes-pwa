import {test,expect} from '@playwright/test';

// Only frontend copy and the document language may change. Authored works and DB records are untouched.
test('switching all four UI languages updates visible controls without a reload',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const picker=page.locator('.scope-language-control select');
  await expect(picker).toBeVisible();
  await expect(picker.locator('option')).toHaveCount(4);
  const languages=[
    ['ja','言語','LOCホーム'],
    ['en','Language','LOC Home'],
    ['zh-Hans','语言','回月典首页'],
    ['zh-Hant','語系','回月典首頁']
  ];
  for(const [locale,label,home] of languages){
    await picker.selectOption(locale);
    await expect(picker).toHaveValue(locale);
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page.locator('.scope-language-control span')).toHaveText(label);
    await expect(page.locator('.scope-nav-loc-home')).toHaveText(home);
  }
});
