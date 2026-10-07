import {test,expect} from '@playwright/test';

test.describe('LunaRunes tabletop UI',()=>{
  test('desktop can start a two-player game and finish opening setup',async({page})=>{
    await page.goto('/game/',{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('heading',{name:'月之符文'})).toBeVisible({timeout:15_000});
    await expect(page.getByText('66 枚符文',{exact:true})).toBeVisible({timeout:15_000});
    await page.getByRole('button',{name:'開始遊戲'}).click();
    await expect(page.getByText(/玩家 A 起手設定/)).toBeVisible();
    let cards=page.locator('.lrg-player.active .lrg-card');
    await expect(cards).toHaveCount(8);
    for(let i=0;i<3;i++)await cards.nth(i).click();
    const confirm=page.getByRole('button',{name:/確認棄牌/});
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page.getByText(/玩家 B 起手設定/)).toBeVisible();
    cards=page.locator('.lrg-player.active .lrg-card');
    for(let i=0;i<3;i++)await cards.nth(i).click();
    await page.getByRole('button',{name:/確認棄牌/}).click();
    await expect(page.getByText(/EVENT/)).toBeVisible();
    await expect(page.getByText(/第 1 回合/).first()).toBeVisible();

    const players=page.locator('.lrg-player');
    await expect(players).toHaveCount(2);
    for(let player=0;player<2;player++){
      const hand=players.nth(player).locator('.lrg-card');
      await hand.nth(0).click();
      await hand.nth(1).click();
    }
    const resolve=page.getByRole('button',{name:'結算事件'});
    await expect(resolve).toBeEnabled();
    await resolve.click();
    await expect(page.getByText(/第 2 回合/).first()).toBeVisible();
  });

  test('event conditions render full macro names instead of storage abbreviations',async({page})=>{
    await page.goto('/game/',{waitUntil:'domcontentloaded'});
    const eventsTab=page.getByRole('tab',{name:/事件 32/});
    await expect(eventsTab).toBeVisible({timeout:15_000});
    await eventsTab.click();
    const eventCards=page.locator('.lrg-doc-grid .lrg-doc-item');
    await expect(eventCards.first()).toBeVisible();
    const text=await eventCards.allTextContents();
    const joined=text.join('\n');
    expect(joined).toMatch(/靈魂＋連結|礦物＋生命|自然＋元素|秩序＋無序/);
    expect(joined).not.toMatch(/條件：\s*(?:SL|ML|NE|OD)(?:\s*[+/]\s*(?:SL|ML|NE|OD))*/);
  });

  test('reference tabs expose the eight roles from the current database',async({page})=>{
    await page.goto('/game/',{waitUntil:'domcontentloaded'});
    const rolesTab=page.getByRole('tab',{name:/八職 8/});
    await expect(rolesTab).toBeVisible({timeout:15_000});
    await rolesTab.click();
    await expect(page.locator('.lrg-doc-grid .lrg-doc-item')).toHaveCount(8);
  });

  test('mobile keeps four rune cards per row without horizontal overflow',async({page},testInfo)=>{
    test.skip(!testInfo.project.name.includes('mobile'),'mobile-only layout contract');
    await page.goto('/game/',{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('button',{name:'開始遊戲'})).toBeVisible({timeout:15_000});
    await page.getByRole('button',{name:'開始遊戲'}).click();
    const hand=page.locator('.lrg-player.active .lrg-hand');
    await expect(hand).toBeVisible();
    const columns=await hand.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(4);
    const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('LunaRunes home stays mineral while game defaults to nature and still accepts theme changes',async({page})=>{
    await page.goto('/lrunes/',{waitUntil:'domcontentloaded'});
    await expect(page.locator('html')).toHaveAttribute('data-theme-id','theme-5',{timeout:15_000});
    await expect.poll(()=>page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--loc-bg').trim().toLowerCase())).toBe('#d9c878');

    await page.goto('/game/',{waitUntil:'domcontentloaded'});
    await expect(page.locator('html')).toHaveAttribute('data-theme-id','theme-4',{timeout:15_000});
    const themeSelect=page.locator('.scope-theme-control select').first();
    await expect(themeSelect).toBeVisible();
    const start=page.getByRole('button',{name:'開始遊戲'});
    await expect(start).toBeVisible();

    const natureButton=await start.evaluate(el=>getComputedStyle(el).backgroundColor);
    await themeSelect.selectOption('theme-1');
    await expect(page.locator('html')).toHaveAttribute('data-theme-id','theme-1');
    const soulButton=await start.evaluate(el=>getComputedStyle(el).backgroundColor);

    expect(soulButton).not.toBe(natureButton);
    await themeSelect.selectOption('system-default');
    await expect(page.locator('html')).toHaveAttribute('data-theme-id','theme-4');
    await expect(page.getByRole('heading',{name:'月之符文'})).toBeVisible();
  });
});
