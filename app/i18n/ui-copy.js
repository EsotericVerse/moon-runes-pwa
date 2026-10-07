// Site UI copy only. Do not route Galaxy/work content, LunaRunes canonical semantics,
// rune English names, divination text, or other authored content through this registry.

const zhHant=Object.freeze({
  common:Object.freeze({
    save:'儲存',
    saving:'儲存中…',
    add:'新增',
    edit:'編輯',
    delete:'刪除',
    cancel:'取消',
    retry:'重新讀取',
    refresh:'重新整理',
    loading:'讀取中…',
    none:'目前沒有資料。',
    title:'標題',
    body:'全文',
    date:'日期',
    type:'種類',
    source:'來源',
    result:'結果',
    settings:'設定',
    management:'管理',
    hiddenFromSearch:'不列入搜尋',
    theme:'主題',
    systemTheme:'系統預設',
    autoTheme:'自動（日／夜）',
    language:'語系'
  }),
  nav:Object.freeze({
    aria:'全站導覽',
    lunarunes:'月之符文',
    author:'作者介紹',
    home:'回月典首頁',
    search:'搜尋',
    searchAria:'搜尋文字',
    contact:'聯絡方式'
  }),
  features:Object.freeze({
    statics:Object.freeze({
      title:'統計',
      subtitle:'用圖表查看作品數量、來源比例與時間變化。',
      description:'選擇統計項目、圖形與時間範圍，比較資料在不同時期的分布與變化。'
    }),
    culture:Object.freeze({
      title:'文化',
      subtitle:'把作品放回時間順序，觀察不同時期的累積與變化。',
      description:'時間長河依日期呈現作品與來源；定錨點用來切分時期，方便比較前後差異。'
    }),
    governance:Object.freeze({
      title:'治理',
      subtitle:'說明使用原則、權利邊界與管理方式。',
      description:'治理頁整理這個區域的基本原則、著作權與授權方式。'
    }),
    search:Object.freeze({
      title:'搜尋',
      subtitle:'輸入關鍵字，從文字、作品、多媒體與符文中找到相關內容。',
      description:'搜尋結果會保留原本的來源與關係，方便回到完整內容或延伸查看前後脈絡。'
    })
  }),
  scope:Object.freeze({
    loc:Object.freeze({
      label:'月典',
      ranking:'總排行榜',
      statics:'用圖表查看作品數量、來源比例與時間變化。',
      culture:'把作品放回時間順序，觀察不同時期的累積與變化。',
      governance:'說明月典的使用原則、權利邊界與管理方式。',
      search:'從關鍵字找到月典中的文字、作品、多媒體與相關內容。'
    }),
    author:Object.freeze({
      label:'作者簡介',
      ranking:'作者排行榜',
      search:'從關鍵字、作品、來源或日期找到相關內容，再查看前後脈絡。'
    }),
    admin:Object.freeze({
      label:'治理管理',
      ranking:'排行榜'
    })
  }),
  search:Object.freeze({
    start:'輸入關鍵字開始搜尋。',
    allContent:'全部內容',
    mode:'搜尋模式',
    media:'多媒體',
    mediaSearch:'多媒體搜尋',
    allSearch:'全部搜尋',
    mediaPromptLabel:'找多媒體',
    textPromptLabel:'你想找什麼？',
    typePrefix:'類型：',
    sourceIdPrefix:'來源識別：',
    songLink:'歌曲連結',
    mediaPrompt:'輸入多媒體關鍵字、類型或來源識別。',
    mediaPlaceholder:'搜尋圖片、影音、網址、標籤或來源識別',
    textPlaceholder:'輸入關鍵字、作品名稱或文字',
    mediaLink:'媒體連結',
    externalLink:'外部連結',
    parentText:'所屬文字',
    searching:'搜尋中…',
    failed:'搜尋失敗。',
    readFailed:'資料讀取失敗',
    updateFailed:'資料更新失敗',
    loadingRelation:'載入關聯文字…',
    relationLoaded:'已載入關聯文字。',
    relationFailed:'文字載入失敗。',
    notFound:'找不到這筆文字。',
    displaySource:'文字展示',
    fullTextNotFound:'找不到全文資料。',
    fullTextFailed:'全文載入失敗。',
    editNotFound:'找不到要編輯的資料。',
    editLoadFailed:'無法載入編輯內容。',
    editDenied:'沒有修改此內容的權限。',
    saveFailed:'儲存失敗。',
    editing:'編輯中',
    more:'載入更多',
    empty:'沒有符合條件的結果。'
  }),
  statistics:Object.freeze({
    line:'折線圖',
    bar:'長條圖',
    pie:'圓餅圖',
    totalSource:'總來源',
    workSource:'作品來源',
    year:'一年',
    month:'一月',
    week:'一週',
    custom:'自訂範圍',
    noOptions:'沒有符合的統計項目',
    item:'統計項目',
    result:'統計結果',
    chart:'圖形',
    range:'時間範圍',
    start:'開始',
    end:'結束',
    invalidRange:'請設定有效的開始與結束日期。',
    itemSuffix:'項'
  }),
  culture:Object.freeze({
    distribution:'時間分布',
    river:'時間長河',
    intersectionRiver:'交會時間長河',
    combinedSources:'綜合來源',
    combinedRiver:'綜合來源時間長河',
    classificationRiver:'作品分類河道',
    structure:'時期・事件・定錨點',
    period:'時期',
    allTime:'全部時間',
    allWorks:'全部作品',
    list:'列表',
    virtualAnchor:'虛擬定錨點',
    virtualAnchorHelp:'點時間長河上的 ◇ 或下方日期可查看並選取切點；虛擬點不會寫入資料庫。',
    showAllWorks:'顯示全部作品',
    editing:'編輯中',
    noPeriodClassification:'目前沒有此時期的作品分類資料。',
    selectedPrefix:'已選取｜',
    creating:'建立中…'
  }),
  governance:Object.freeze({
    rights:'權利與授權',
    systemManagement:'系統管理',
    enterAdmin:'進入獨立管理站',
    enterManagement:'進入管理'
  }),
  work:Object.freeze({
    viewLinks:'查看連結',
    relatedText:'關聯文字',
    untitled:'未命名作品',
    hidden:'此項目目前隱藏（僅管理者可見）',
    link:'連結',
    noBody:'此作品目前沒有正文。',
    loadingBody:'載入全文中…',
    collapseBody:'收合全文',
    viewBody:'查看全文'
  }),
  management:Object.freeze({
    article:'發表文章',
    import:'資料匯入',
    keywords:'關鍵詞管理',
    checking:'正在確認登入與管理權限…',
    signOut:'登出',
    item:'管理項目',
    noOptions:'沒有符合的管理項目',
    permissionDenied:'目前登入身份沒有此區域的管理權限。',
    eyebrow:'管理',
    locTitle:'LOC 系統管理',
    locDescription:'LOC 的系統管理已集中到獨立管理站。',
    locAdminLink:'前往 admin.lo3rwang.cc',
    dataType:'資料類型',
    galaxyText:'Galaxy 文字',
    searchStatus:'搜尋狀態',
    allData:'全部資料',
    searchable:'可搜尋',
    notSearchable:'不可搜尋',
    notSearchableData:'不可搜尋資料',
    previous:'上一頁',
    next:'下一頁',
    createdPrefix:'建立 ',
    updatedPrefix:'更新 ',
    articleSource:'來源',
    articleParent:'上層／來源',
    articleTarget:'下層／目標',
    articleReference:'參照',
    articleBody:'正文',
    articleUrl:'原始連結',
    articleTime:'發表時間',
    sourceRequired:'請指定來源。',
    articlePublished:'文章已發表到 Galaxy。',
    articlePublishFailed:'文章發表失敗。',
    importJson:'JSON 匯入',
    sourceChoice:'來源選擇',
    currentFile:'本次檔案',
    startImport:'開始匯入',
    importing:'匯入中…',
    addMedia:'新增多媒體',
    addSuno:'儲存 Suno 資料',
    songTitle:'歌名',
    lyrics:'歌詞'
  }),
  admin:Object.freeze({
    eyebrow:'系統管理',
    loginTitle:'系統管理登入',
    loginIntro:'Admin 是獨立管理站，不屬於 Scope。',
    signIn:'使用 Google 登入',
    checking:'正在確認 Admin 權限…',
    denied:'目前登入身份沒有 Admin 權限。',
    overview:'區域總覽',
    theme:'預設 Theme',
    item:'管理項目'
  }),
  format:Object.freeze({
    searchScope:label=>`搜尋「${label}」資料…`,
    searchResult:({label,query,hasMore,partial=''})=>`${label}搜尋「${query}」；先顯示本批結果${hasMore?'，向下滑動可繼續載入。':'。'}${partial}`,
    relatedText:index=>`${zhHant.work.relatedText} ${index}`,
    link:index=>`${zhHant.work.link} ${index}`,
    songLink:index=>`${zhHant.search.songLink} ${index}`,
    period:index=>`時期 ${index}`,
    selected:value=>`${zhHant.culture.selectedPrefix}${value}`
  })
});

const zhHans=Object.freeze({
  ...zhHant,
  common:Object.freeze({...zhHant.common,save:'保存',saving:'保存中…',add:'新增',edit:'编辑',delete:'删除',cancel:'取消',retry:'重新读取',refresh:'刷新',loading:'读取中…',none:'目前没有资料。',title:'标题',body:'全文',date:'日期',type:'类型',source:'来源',result:'结果',settings:'设置',management:'管理',hiddenFromSearch:'不列入搜索',theme:'主题',systemTheme:'系统默认',autoTheme:'自动（日／夜）',language:'语言'}),
  nav:Object.freeze({...zhHant.nav,aria:'全站导航',lunarunes:'月之符文',author:'作者介绍',home:'回月典首页',search:'搜索',searchAria:'搜索文字',contact:'联系方式'}),
  features:Object.freeze({
    statics:Object.freeze({title:'统计',subtitle:'用图表查看作品数量、来源比例与时间变化。',description:'选择统计项目、图形与时间范围，比较资料在不同时期的分布与变化。'}),
    culture:Object.freeze({title:'文化',subtitle:'把作品放回时间顺序，观察不同时期的累积与变化。',description:'时间长河依日期呈现作品与来源；定锚点用来切分时期，方便比较前后差异。'}),
    governance:Object.freeze({title:'治理',subtitle:'说明使用原则、权利边界与管理方式。',description:'治理页整理这个区域的基本原则、著作权与授权方式。'}),
    search:Object.freeze({title:'搜索',subtitle:'输入关键字，从文字、作品、多媒体与符文中找到相关内容。',description:'搜索结果会保留原本的来源与关系，方便回到完整内容或延伸查看前后脉络。'})
  }),
  statistics:Object.freeze({...zhHant.statistics,line:'折线图',bar:'柱状图',pie:'饼图',totalSource:'总来源',workSource:'作品来源',year:'一年',month:'一月',week:'一周',custom:'自定义范围',item:'统计项目',result:'统计结果',chart:'图形',range:'时间范围',start:'开始',end:'结束'}),
  governance:Object.freeze({...zhHant.governance,rights:'权利与授权',systemManagement:'系统管理',enterAdmin:'进入独立管理站',enterManagement:'进入管理'}),
  management:Object.freeze({...zhHant.management,article:'发表文章',import:'资料导入',keywords:'关键词管理',checking:'正在确认登录与管理权限…',signOut:'登出',item:'管理项目',permissionDenied:'目前登录身份没有此区域的管理权限。',eyebrow:'管理'}),
  admin:Object.freeze({...zhHant.admin,eyebrow:'系统管理',loginTitle:'系统管理登录',signIn:'使用 Google 登录',checking:'正在确认 Admin 权限…',denied:'目前登录身份没有 Admin 权限。',theme:'默认 Theme',item:'管理项目'})
});

const en=Object.freeze({
  ...zhHant,
  common:Object.freeze({...zhHant.common,save:'Save',saving:'Saving…',add:'Add',edit:'Edit',delete:'Delete',cancel:'Cancel',retry:'Retry',refresh:'Refresh',loading:'Loading…',none:'No data.',title:'Title',body:'Full text',date:'Date',type:'Type',source:'Source',result:'Result',settings:'Settings',management:'Management',hiddenFromSearch:'Hide from search',theme:'Theme',systemTheme:'System default',autoTheme:'Auto (day/night)',language:'Language'}),
  nav:Object.freeze({...zhHant.nav,aria:'Site navigation',lunarunes:'LunaRunes',author:'Author',home:'LOC Home',search:'Search',searchAria:'Search text',contact:'Contact'}),
  features:Object.freeze({
    statics:Object.freeze({title:'Statistics',subtitle:'View work counts, source ratios, and changes over time.',description:'Choose a statistic, chart, and time range to compare distributions and changes.'}),
    culture:Object.freeze({title:'Culture',subtitle:'Place works back on the timeline to observe accumulation and change.',description:'The time river shows works and sources by date; anchors divide periods for comparison.'}),
    governance:Object.freeze({title:'Governance',subtitle:'Usage principles, rights boundaries, and management.',description:'Governance documents the basic rules, copyright, and licensing for this scope.'}),
    search:Object.freeze({title:'Search',subtitle:'Find text, works, media, and runes by keyword.',description:'Results preserve source and relationships so you can return to the full context.'})
  }),
  scope:Object.freeze({
    ...zhHant.scope,
    loc:Object.freeze({...zhHant.scope.loc,label:'LOC',ranking:'Overall ranking',statics:'View work counts, source ratios, and changes over time.',culture:'Place works back on the timeline and compare periods.',governance:'LOC usage principles, rights boundaries, and management.',search:'Search LOC text, works, media, and related content.'}),
    author:Object.freeze({...zhHant.scope.author,label:'Author',ranking:'Author ranking',search:'Find related content by keyword, work, source, or date.'}),
    admin:Object.freeze({...zhHant.scope.admin,label:'Administration',ranking:'Ranking'})
  }),
  search:Object.freeze({...zhHant.search,start:'Enter a keyword to search.',allContent:'All content',mode:'Search mode',media:'Media',mediaSearch:'Media search',allSearch:'All search',mediaPromptLabel:'Find media',textPromptLabel:'What are you looking for?',searching:'Searching…',failed:'Search failed.',empty:'No matching results.'}),
  statistics:Object.freeze({...zhHant.statistics,line:'Line',bar:'Bar',pie:'Pie',totalSource:'Total sources',workSource:'Work sources',year:'1 year',month:'1 month',week:'1 week',custom:'Custom range',noOptions:'No statistics available',item:'Statistic',result:'Statistics',chart:'Chart',range:'Time range',start:'Start',end:'End',invalidRange:'Set a valid start and end date.',itemSuffix:' items'}),
  culture:Object.freeze({...zhHant.culture,distribution:'Time distribution',river:'Time river',intersectionRiver:'Intersection river',combinedSources:'Combined sources',combinedRiver:'Combined source river',classificationRiver:'Work classification river',structure:'Periods · Events · Anchors',period:'Period',allTime:'All time',allWorks:'All works',list:'List',virtualAnchor:'Virtual anchor',showAllWorks:'Show all works',editing:'Editing',selectedPrefix:'Selected | ',creating:'Creating…'}),
  governance:Object.freeze({...zhHant.governance,rights:'Rights & Licensing',systemManagement:'System management',enterAdmin:'Open Admin',enterManagement:'Open Management'}),
  work:Object.freeze({...zhHant.work,viewLinks:'View links',relatedText:'Related text',untitled:'Untitled work',hidden:'This item is hidden (managers only)',link:'Link',noBody:'No body text.',loadingBody:'Loading full text…',collapseBody:'Collapse',viewBody:'View full text'}),
  management:Object.freeze({...zhHant.management,article:'Publish article',import:'Data import',keywords:'Keyword management',checking:'Checking login and permissions…',signOut:'Sign out',item:'Management item',noOptions:'No management options',permissionDenied:'This account does not have management permission for this scope.',eyebrow:'Management',locTitle:'LOC System Management',locDescription:'LOC system management is centralized in the Admin site.',dataType:'Data type',searchStatus:'Search status',previous:'Previous',next:'Next',articleSource:'Source',articleParent:'Parent / Source',articleTarget:'Target',articleReference:'Reference',articleBody:'Body',articleUrl:'Original URL',articleTime:'Published time',sourceRequired:'Source is required.',articlePublished:'Article published to Galaxy.',articlePublishFailed:'Article publication failed.',importJson:'JSON import',sourceChoice:'Source',currentFile:'File',startImport:'Start import',importing:'Importing…',songTitle:'Song title',lyrics:'Lyrics'}),
  admin:Object.freeze({...zhHant.admin,eyebrow:'System Administration',loginTitle:'Admin Login',loginIntro:'Admin is a separate management site, not a Scope.',signIn:'Sign in with Google',checking:'Checking Admin permission…',denied:'This account does not have Admin permission.',overview:'Overview',theme:'Default Theme',item:'Management item'}),
  format:Object.freeze({
    searchScope:label=>`Search “${label}”…`,
    searchResult:({label,query,hasMore,partial=''})=>`${label}: “${query}”${hasMore?' · more results available':''}${partial}`,
    relatedText:index=>`Related text ${index}`,
    link:index=>`Link ${index}`,
    songLink:index=>`Song link ${index}`,
    period:index=>`Period ${index}`,
    selected:value=>`Selected | ${value}`
  })
});

export const UI_LOCALE='zh-Hant';
export const UI_LOCALE_OPTIONS=Object.freeze([
  Object.freeze({value:'zh-Hant',label:'繁體中文'}),
  Object.freeze({value:'zh-Hans',label:'简体中文'}),
  Object.freeze({value:'en',label:'English'})
]);
export const UI_COPY=zhHant;
export const UI_DICTIONARIES=Object.freeze({'zh-Hant':zhHant,'zh-Hans':zhHans,en});

export function normalizeUiLocale(locale){
  const value=String(locale||'').trim();
  return UI_DICTIONARIES[value]?value:UI_LOCALE;
}

export function uiCopy(locale=UI_LOCALE){
  return UI_DICTIONARIES[normalizeUiLocale(locale)];
}
