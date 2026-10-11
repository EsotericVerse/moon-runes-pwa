import {test,expect} from '@playwright/test';

test('settings uses a compact React Select function picker, including a read-only favorites view',async({page})=>{
  await page.goto('/settings/',{waitUntil:'domcontentloaded'});
  const picker=page.getByRole('combobox',{name:'選擇設定功能'});
  await expect(picker).toBeVisible();
  await expect(page.getByRole('heading',{name:'每日符文行事曆'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'我的最愛'})).toHaveCount(0);

  await picker.click();
  await page.getByRole('option',{name:'我的最愛（展示）'}).click();
  await expect(page.getByRole('heading',{name:'我的最愛'})).toBeVisible();
  await expect(page.getByText('月之符文',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('新增、刪除與目錄管理暫不啟用。')).toBeVisible();
  await expect(page.getByRole('button',{name:'儲存我的最愛'})).toHaveCount(0);

  await picker.click();
  await page.getByRole('option',{name:'文件匯入／匯出'}).click();
  await expect(page.getByRole('heading',{name:'文件匯入／匯出'})).toBeVisible();
  await expect(page.getByText(/網站匯入使用 Supabase/)).toBeVisible();
  await expect(page.getByRole('link',{name:'開啟私人本機匯入工作區'})).toHaveCount(0);

  await picker.click();
  await page.getByRole('option',{name:'帳號'}).click();
  await expect(page.getByRole('heading',{name:'登入'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'每日符文行事曆'})).toHaveCount(0);
});
