import {test,expect} from '@playwright/test';

test('settings only presents functional panes without redundant favorites or daily Rune screens',async({page})=>{
  await page.goto('/settings/',{waitUntil:'domcontentloaded'});
  const picker=page.getByRole('combobox',{name:'選擇設定功能'});
  // react-select renders a dummy input which can lie outside the viewport;
  // click the actual visible control, not the internal combobox input.
  const pickerControl=page.locator('.loc-settings-select').first().locator('.loc-settings-select__control');
  await expect(picker).toBeVisible();
  await expect(page.getByRole('heading',{name:'首頁設定'})).toBeVisible();
  await expect(page.getByText('我的最愛',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'每日符文行事曆'})).toHaveCount(0);
  await expect(page.getByText('月典抽牌',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'儲存我的最愛'})).toHaveCount(0);

  await pickerControl.click();
  await expect(page.getByRole('option',{name:'我的最愛（展示）'})).toHaveCount(0);
  await expect(page.getByRole('option',{name:'每日符文紀錄'})).toHaveCount(0);
  await page.getByRole('option',{name:'文件匯入'}).click();
  await expect(page.getByRole('heading',{name:'文件匯入'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'首頁設定'})).toHaveCount(0);

  await pickerControl.click();
  await page.getByRole('option',{name:'帳號'}).click();
  await expect(page.getByRole('heading',{name:'帳號'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'文件匯入'})).toHaveCount(0);
});
