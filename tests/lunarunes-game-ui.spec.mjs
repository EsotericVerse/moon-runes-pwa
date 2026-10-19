import {test,expect} from '@playwright/test';

test.describe('LunaRunes tabletop UI',()=>{
  test('new GameBoard homepage image covers the complete Hero on desktop and mobile',async({page})=>{
    await page.goto('/lrunes/game/',{waitUntil:'domcontentloaded'});
    const hero=page.locator('.lrg-home-hero');
    await expect(hero).toBeVisible({timeout:15_000});
    const artwork=hero.locator('.lrg-hero-image');
    await expect(artwork).toBeVisible();
    const measurements=await hero.evaluate(el=>{
      const art=el.querySelector('.lrg-hero-image');
      const copy=el.querySelector('.lrg-home-copy');
      const frame=el.getBoundingClientRect();
      const image=art.getBoundingClientRect();
      const imgStyle=getComputedStyle(art);
      const copyStyle=getComputedStyle(copy);
      return {
        loaded:art.complete&&art.naturalWidth>0,
        objectFit:imgStyle.objectFit,
        position:imgStyle.position,
        leftGap:Math.abs(image.left-frame.left),
        rightGap:Math.abs(image.right-frame.right),
        topGap:Math.abs(image.top-frame.top),
        bottomGap:Math.abs(image.bottom-frame.bottom),
        copyAboveImage:Number(copyStyle.zIndex)>Number(imgStyle.zIndex),
        heroOverflowRight:Math.max(0,image.right-document.documentElement.clientWidth),
        heroOverflowLeft:Math.max(0,-image.left)
      };
    });
    expect(measurements.loaded).toBe(true);
    expect(measurements.position).toBe('absolute');
    expect(measurements.objectFit).toBe('cover');
    expect(measurements.leftGap).toBeLessThanOrEqual(2);
    expect(measurements.rightGap).toBeLessThanOrEqual(2);
    expect(measurements.topGap).toBeLessThanOrEqual(2);
    expect(measurements.bottomGap).toBeLessThanOrEqual(2);
    expect(measurements.copyAboveImage).toBe(true);
    expect(measurements.heroOverflowLeft).toBeLessThanOrEqual(2);
    expect(measurements.heroOverflowRight).toBeLessThanOrEqual(2);
  });

  test('Game Hero is visible before the game SQL dataset finishes loading',async({page})=>{
    // Diagnostics are emitted only from this loading regression, so failures
    // identify actual browser, hydration and SQL errors instead of guessing.
    const pageErrors=[],consoleErrors=[],failedRequests=[],dataRequests=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
    page.on('requestfailed',request=>failedRequests.push(request.method()+' '+request.url().split('?')[0]+' '+request.failure()?.errorText));
    page.on('request',request=>{if(request.url().includes('/rest/v1/'))dataRequests.push(request.method()+' '+request.url().split('?')[0])});
    let release;
    const hold=new Promise(resolve=>{release=resolve;});
    let delayedQueries=0;
    // Primary Supabase reads use its managed PostgREST API; delay the actual
    // game table requests rather than the optional generic Kysely Edge path.
    await page.route('**/rest/v1/game**',async route=>{
      if(['GET','HEAD'].includes(route.request().method())){
        delayedQueries++;
        await hold;
      }
      await route.continue();
    });
    try{
      await page.goto('/lrunes/game/',{waitUntil:'domcontentloaded'});
      await expect.poll(()=>delayedQueries,{timeout:12_000}).toBeGreaterThan(0);
      const hero=page.locator('.lrg-home-hero');
      await expect(hero).toBeVisible();
      await expect(hero.locator('.lrg-hero-image')).toBeVisible();
      await expect(page.getByText('載入遊戲資料…')).toBeVisible();
    }finally{
      const snapshot=await page.evaluate(()=>({
        readyState:document.readyState,
        title:document.title,
        body:document.body?.innerText?.slice(0,850)||'',
        root:document.querySelector('[data-loc-view]')?.getAttribute('data-loc-view')||'missing',
        loading:document.querySelector('.loc-loading')?.textContent||null,
        gameHero:!!document.querySelector('.lrg-home-hero'),
        scripts:performance.getEntriesByType('resource').filter(x=>x.name.includes('/_next/static/chunks/')).length
      })).catch(e=>({error:e.message}));
      console.log('[game-load-diagnostics]',JSON.stringify({
        delayedQueries,snapshot,pageErrors:pageErrors.slice(0,5),
        consoleErrors:consoleErrors.slice(0,5),failedRequests:failedRequests.slice(0,8),
        dataRequests:dataRequests.slice(0,20)
      }));
      release();
    }
  });

  test('desktop can start a two-player game and finish opening setup',async({page})=>{
    const unnecessaryCountRequests=[],gameSelectRequests=[],scopeConfigRequests=[];
    page.on('request',request=>{
      const method=request.method(),url=request.url();
      if(method==='GET'&&url.includes('/rest/v1/lrunes?'))scopeConfigRequests.push(url);
      if(!url.includes('/rest/v1/game?')&&!url.includes('/rest/v1/runes?'))return;
      if(method==='HEAD')unnecessaryCountRequests.push(url);
      if(method==='GET')gameSelectRequests.push(url);
    });
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
    expect(gameSelectRequests.length,'The game must have loaded its real SQL dataset before counting queries').toBeGreaterThanOrEqual(7);
    expect(unnecessaryCountRequests,'Game and Rune facts must come from counted SELECTs, not separate HEAD COUNT probes').toEqual([]);
    expect(scopeConfigRequests.length,'Scope Runtime, theme and locale must share one config SQL request').toBeLessThanOrEqual(1);
    console.log('[game-sql-audit]',JSON.stringify({dataSelects:gameSelectRequests.length,extraHeadCounts:unnecessaryCountRequests.length,scopeConfigSelects:scopeConfigRequests.length}));

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
    const eventsTab=page.getByRole('tab',{name:/事件 64/});
    await expect(eventsTab).toBeVisible({timeout:15_000});
    await eventsTab.click();
    const eventCards=page.locator('.lrg-doc-grid .lrg-doc-item');
    await expect(eventCards.first()).toBeVisible();
    const text=await eventCards.allTextContents();
    const joined=text.join('\n');
    expect(joined).toMatch(/靈魂＋連結|礦物＋生命|自然＋元素|秩序＋無序/);
    expect(joined).not.toMatch(/條件：\s*(?:SL|ML|NE|OD)(?:\s*[+/]\s*(?:SL|ML|NE|OD))*/);
  });

  test('rune cards surface action text and group visual',async({page})=>{
    await page.goto('/game/',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'開始遊戲'}).click();
    const card=page.locator('.lrg-card').first();
    await expect(card).toBeVisible();
    await expect(card.locator('.lrg-rune-art')).toBeVisible();
    await expect(card.locator('.lrg-card-action')).toBeVisible();
    // Group artwork is optional per dealt Rune, so check a rendered mark
    // rather than requiring the random first card to always have one.
    const marks=page.locator('.lrg-card .lrg-group-mark');
    expect(await marks.count()).toBeGreaterThan(0);
    await expect(marks.first()).toBeVisible();
  });

  test('Event scoring help explains all four scoring points',async({page})=>{
    await page.goto('/game/',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'開始遊戲'}).click();
    let cards=page.locator('.lrg-player.active .lrg-card');
    for(let i=0;i<3;i++)await cards.nth(i).click();
    await page.getByRole('button',{name:/確認棄牌/}).click();
    cards=page.locator('.lrg-player.active .lrg-card');
    for(let i=0;i<3;i++)await cards.nth(i).click();
    await page.getByRole('button',{name:/確認棄牌/}).click();

    const help=page.getByRole('button',{name:'查看 Event 得分計算'});
    await expect(help).toBeVisible();
    await help.click();
    await expect(page.getByText('Event 最高 4 分，這樣計算：')).toBeVisible();
    await expect(page.getByText('第一張符文的群組符合事件條件：+1')).toBeVisible();
    await expect(page.getByText('第二張符文的群組符合事件條件：+1')).toBeVisible();
    await expect(page.getByText('兩張回應牌中至少出現 1 種符文群組：+1')).toBeVisible();
    await expect(page.getByText('兩張符文來自不同群組：再 +1')).toBeVisible();
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
    await expect.poll(()=>page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--loc-bg').trim().toLowerCase())).toBe('#fff1b2');

    await page.goto('/game/',{waitUntil:'domcontentloaded'});
    await expect(page.locator('html')).toHaveAttribute('data-theme-id','theme-4',{timeout:15_000});
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await expect.poll(()=>page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--loc-bg').trim().toLowerCase())).toBe('#081b13');
    const themeSelect=page.locator('.scope-theme-control select').first();
    await expect(themeSelect).toBeVisible();
    // Life retains its vivid orange baseline even as secondary panels are unified.
    await themeSelect.selectOption('theme-3');
    await expect(page.locator('html')).toHaveAttribute('data-theme-id','theme-3');
    await expect.poll(()=>page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--loc-bg').trim().toLowerCase())).toBe('#ff8a00');
    await themeSelect.selectOption('system-default');
    await expect(page.locator('html')).toHaveAttribute('data-theme-id','theme-4');
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
