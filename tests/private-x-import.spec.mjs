import {test,expect} from '@playwright/test';

const fixture=ids=>'window.YTD.tweet.part0 = '+JSON.stringify(ids.map(id=>({
  tweet:{
    id_str:String(id),
    full_text:'LOC X 私人備份驗證內容 '+id+'，繁體中文。',
    created_at:'Mon Oct 09 15:26:46 +0000 2023',
    lang:'zh'
  }
})))+';';

test('website X archive: pre-count, detect duplicates, commit batches, search and clear only locally',async({page})=>{
  const leaked=[];
  page.on('request',request=>{
    const body=request.postData()||'';
    if(body.includes('LOC X 私人備份驗證內容'))leaked.push(request.url());
  });
  await page.goto('/private-import/',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'私人備份共用匯入工作區'})).toBeVisible();
  await page.getByRole('checkbox',{name:/我了解：這是未加密/}).check();

  const input=page.locator('input[type=file]');
  await input.setInputFiles({
    name:'opaque-private-file',
    mimeType:'application/octet-stream',
    buffer:Buffer.from(fixture([101,102,103]),'utf-8')
  });
  await expect(page.getByText('匯入前查重與批次計畫')).toBeVisible({timeout:20000});
  await expect(page.getByText('準備新增 3 筆')).toBeVisible();
  await expect(page.getByText('預估 1 批',{exact:false})).toBeVisible();
  await page.getByRole('checkbox',{name:/已核對來源、筆數/}).check();
  await page.getByRole('button',{name:'確認分批寫入本機'}).click();
  await expect(page.getByText('本機寫入完成：新增 3 筆',{exact:false})).toBeVisible({timeout:15000});
  await expect(page.getByRole('heading',{name:'已確認匯入的私人紀錄（3 筆）'})).toBeVisible();
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'已確認匯入的私人紀錄（3 筆）'})).toBeVisible();
  await page.getByRole('checkbox',{name:/我了解：這是未加密/}).check();
  await input.setInputFiles({name:'different-filename.dat',mimeType:'application/octet-stream',buffer:Buffer.from(fixture([101,102,103]),'utf-8')});
  await expect(page.getByText('準備新增 0 筆')).toBeVisible({timeout:20000});
  await expect(page.getByText('已存在 3 筆')).toBeVisible();
  await page.getByRole('button',{name:'取消並刪除暫存'}).click();
  await expect(page.getByText('已移除未確認的本機暫存資料。')).toBeVisible();
  // Even inside one backup, same native ID with divergent bodies is quarantined.
  const contradictory=[
    {tweet:{id_str:'204',full_text:'第一版本',created_at:'Mon Oct 09 15:26:46 +0000 2023'}},
    {tweet:{id_str:'204',full_text:'第二版本',created_at:'Mon Oct 09 15:26:46 +0000 2023'}}
  ];
  await input.setInputFiles({
    name:'conflicting-ids.js',mimeType:'application/javascript',
    buffer:Buffer.from('window.YTD.tweet.part0 = '+JSON.stringify(contradictory)+';')
  });
  await expect(page.getByText('備份內同 ID 衝突 1 筆')).toBeVisible({timeout:20000});
  await expect(page.getByText('準備新增 0 筆')).toBeVisible();
  await page.getByRole('button',{name:'取消並刪除暫存'}).click();
  await page.getByRole('checkbox',{name:/確認永久清除目前瀏覽器/}).check();
  await page.getByRole('button',{name:'清除全部本機資料'}).click();
  await expect(page.getByRole('heading',{name:'已確認匯入的私人紀錄（0 筆）'})).toBeVisible();
  expect(leaked).toEqual([]);
});
