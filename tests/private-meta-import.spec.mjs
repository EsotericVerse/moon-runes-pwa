import {test,expect} from '@playwright/test';
import {zipSync,strToU8} from 'fflate';

test('Meta mixed ZIP uses the same offline workbench, records unsupported media and deduplicates',async({page})=>{
  const leaked=[];
  page.on('request',request=>{
    if((request.postData()||'').includes('Meta 私人測試訊息'))leaked.push(request.url());
  });
  await page.goto('/private-import/',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'私人備份共用匯入工作區'})).toBeVisible();
  await page.getByRole('checkbox',{name:/我了解：這是未加密/}).check();
  const archive=zipSync({
    'facebook/posts/your_posts_1.json':strToU8(JSON.stringify([
      {timestamp:1700000000,data:[{post:'Facebook 私人測試貼文'}]}
    ])),
    'facebook/messages/inbox/a/message_1.json':strToU8(JSON.stringify({
      messages:[{sender_name:'某人',timestamp_ms:1700000000000,content:'Meta 私人測試訊息'}]
    })),
    'instagram/your_instagram_activity/media/posts_1.json':strToU8(JSON.stringify({
      ig_posts:[{title:'Instagram 私人測試貼文',creation_timestamp:1700000000}]
    })),
    'threads/threads_posts.json':strToU8(JSON.stringify({
      threads:[{id:'12345',text:'Threads 私人測試貼文',timestamp:'2024-01-01T00:00:00Z'}]
    })),
    'facebook/media/picture.jpg':new Uint8Array([255,216,255,224,0,0])
  });
  const input=page.locator('input[type=file]');
  await input.setInputFiles({name:'meta-combined.zip',mimeType:'application/zip',buffer:Buffer.from(archive)});
  await expect(page.getByText('準備新增 4 筆')).toBeVisible({timeout:25000});
  await expect(page.getByText(/Messenger|messenger/).first()).toBeVisible();
  await expect(page.getByText('未解析 ZIP 項目 1 個（其中媒體 1 個）',{exact:false})).toBeVisible();
  await page.getByRole('checkbox',{name:/已核對來源、筆數/}).check();
  await page.getByRole('button',{name:'確認分批寫入本機'}).click();
  await expect(page.getByRole('heading',{name:'已確認匯入的私人紀錄（4 筆）'})).toBeVisible({timeout:20000});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'已確認匯入的私人紀錄（4 筆）'})).toBeVisible();
  await page.getByRole('checkbox',{name:/確認永久清除目前瀏覽器/}).check();
  await page.getByRole('button',{name:'清除全部本機資料'}).click();
  await expect(page.getByRole('heading',{name:'已確認匯入的私人紀錄（0 筆）'})).toBeVisible();
  expect(leaked).toEqual([]);
});
