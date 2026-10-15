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
    loginIntro:'Admin 管理站',
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
  admin:Object.freeze({...zhHant.admin,eyebrow:'System Administration',loginTitle:'Admin Login',loginIntro:'Admin management',signIn:'Sign in with Google',checking:'Checking Admin permission…',denied:'This account does not have Admin permission.',overview:'Overview',theme:'Default Theme',item:'Management item'}),
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


const ja=Object.freeze({
  ...en,
  common:Object.freeze({...en.common,
    save:'保存',saving:'保存中…',add:'追加',edit:'編集',delete:'削除',cancel:'キャンセル',
    retry:'再読み込み',refresh:'更新',loading:'読み込み中…',none:'データがありません。',
    title:'タイトル',body:'全文',date:'日付',type:'種類',source:'ソース',result:'結果',
    settings:'設定',management:'管理',hiddenFromSearch:'検索対象から除外',
    theme:'テーマ',systemTheme:'システム既定',autoTheme:'自動（日中／夜間）',language:'言語'
  }),
  nav:Object.freeze({...en.nav,
    aria:'サイト内ナビゲーション',author:'著者紹介',home:'LOCホーム',
    search:'検索',searchAria:'テキスト検索',contact:'お問い合わせ'
  }),
  features:Object.freeze({
    statics:Object.freeze({title:'統計',
      subtitle:'作品数、ソースの比率、時間による変化をグラフで確認します。',
      description:'統計項目、グラフ、期間を選び、分布と変化を比較します。'}),
    culture:Object.freeze({title:'文化',
      subtitle:'作品を時系列で表示し、各時期の蓄積と変化を確認します。',
      description:'タイムラインに作品とソースを日付順に表示し、アンカーで時期を区切って比較します。'}),
    governance:Object.freeze({title:'ガバナンス',
      subtitle:'利用原則、権利の範囲、管理方法を案内します。',
      description:'このスコープの基本原則、著作権、利用許諾を確認できます。'}),
    search:Object.freeze({title:'検索',
      subtitle:'キーワードからテキスト、作品、メディアを探します。',
      description:'検索結果にはソースと関連情報を残し、元の内容を確認できます。'})
  }),
  scope:Object.freeze({
    ...en.scope,
    loc:Object.freeze({...en.scope.loc,label:'LOC',ranking:'総合ランキング',
      statics:'作品数、ソースの比率、時間の変化をグラフで確認します。',
      culture:'作品をタイムラインに並べ、時期ごとの違いを比較します。',
      governance:'LOCの利用原則、権利の範囲、管理方法。',
      search:'LOCのテキスト、作品、メディアなどを検索します。'}),
    author:Object.freeze({...en.scope.author,label:'著者紹介',ranking:'著者ランキング',
      search:'キーワード、作品、ソース、日付から関連する内容を探します。'}),
    admin:Object.freeze({...en.scope.admin,label:'システム管理',ranking:'ランキング'})
  }),
  search:Object.freeze({...en.search,
    start:'キーワードを入力して検索してください。',
    allContent:'すべてのコンテンツ',mode:'検索モード',media:'メディア',
    mediaSearch:'メディア検索',allSearch:'すべて検索',mediaPromptLabel:'メディアを探す',
    textPromptLabel:'何を探しますか？',typePrefix:'種類：',sourceIdPrefix:'ソースID：',
    songLink:'楽曲リンク',mediaPrompt:'メディアのキーワード、種類、ソースIDを入力してください。',
    mediaPlaceholder:'画像・動画・URL・タグ・ソースIDを検索',
    textPlaceholder:'キーワード・作品名・文章を入力',
    mediaLink:'メディアリンク',externalLink:'外部リンク',parentText:'関連する文章',
    searching:'検索中…',failed:'検索に失敗しました。',
    readFailed:'データの読み込みに失敗しました',updateFailed:'データの更新に失敗しました',
    loadingRelation:'関連テキストを読み込み中…',relationLoaded:'関連テキストを読み込みました。',
    relationFailed:'テキストの読み込みに失敗しました。',
    notFound:'このテキストは見つかりません。',displaySource:'テキスト表示',
    fullTextNotFound:'全文データが見つかりません。',fullTextFailed:'全文を読み込めませんでした。',
    editNotFound:'編集対象が見つかりません。',editLoadFailed:'編集内容を読み込めません。',
    editDenied:'この内容を編集する権限がありません。',
    saveFailed:'保存に失敗しました。',editing:'編集中',more:'さらに読み込む',
    empty:'一致する結果はありません。'
  }),
  statistics:Object.freeze({...en.statistics,
    line:'折れ線グラフ',bar:'棒グラフ',pie:'円グラフ',
    totalSource:'ソース合計',workSource:'作品のソース',
    year:'1年間',month:'1か月',week:'1週間',custom:'期間を指定',
    noOptions:'統計項目がありません',item:'統計項目',result:'統計結果',
    chart:'グラフ',range:'期間',start:'開始',end:'終了',
    invalidRange:'有効な開始日と終了日を指定してください。',itemSuffix:'件'
  }),
  culture:Object.freeze({...en.culture,
    distribution:'時間分布',river:'タイムライン',intersectionRiver:'交差タイムライン',
    combinedSources:'ソースの合計',combinedRiver:'ソース全体のタイムライン',
    classificationRiver:'作品分類の系列',structure:'時期・イベント・アンカー',
    period:'時期',allTime:'全期間',allWorks:'すべての作品',
    list:'一覧',virtualAnchor:'仮アンカー',
    virtualAnchorHelp:'タイムライン上の◇または下の日付から分割点を選択できます。仮アンカーはデータベースに書き込みません。',
    showAllWorks:'すべての作品を表示',editing:'編集中',
    noPeriodClassification:'この時期の作品分類データはありません。',
    selectedPrefix:'選択済み｜',creating:'作成中…'
  }),
  governance:Object.freeze({...en.governance,
    rights:'権利とライセンス',systemManagement:'システム管理',
    enterAdmin:'管理画面を開く',enterManagement:'管理を開く'
  }),
  work:Object.freeze({...en.work,
    viewLinks:'リンクを見る',relatedText:'関連テキスト',untitled:'無題の作品',
    hidden:'この項目は非公開です（管理者のみ表示）',link:'リンク',
    noBody:'この作品にはまだ本文がありません。',
    loadingBody:'全文を読み込み中…',collapseBody:'全文を閉じる',viewBody:'全文を見る'
  }),
  management:Object.freeze({...en.management,
    article:'記事を公開',import:'データのインポート',keywords:'キーワード管理',
    checking:'ログイン状態と管理権限を確認中…',signOut:'ログアウト',
    item:'管理項目',noOptions:'管理項目がありません',
    permissionDenied:'このアカウントにはこのスコープの管理権限がありません。',
    eyebrow:'管理',locTitle:'LOCシステム管理',
    locDescription:'LOCのシステム管理は専用の管理サイトに集約されています。',
    locAdminLink:'admin.lo3rwang.ccへ',
    dataType:'データ種別',galaxyText:'Galaxyテキスト',
    searchStatus:'検索状態',allData:'すべてのデータ',
    searchable:'検索可能',notSearchable:'検索不可',
    notSearchableData:'検索対象外のデータ',
    previous:'前のページ',next:'次のページ',
    createdPrefix:'作成 ',updatedPrefix:'更新 ',
    articleSource:'ソース',articleParent:'親／ソース',articleTarget:'子／対象',
    articleReference:'参照',articleBody:'本文',articleUrl:'元のリンク',
    articleTime:'公開日時',sourceRequired:'ソースを指定してください。',
    articlePublished:'記事をGalaxyに公開しました。',
    articlePublishFailed:'記事の公開に失敗しました。',
    importJson:'JSONインポート',sourceChoice:'ソースを選択',
    currentFile:'現在のファイル',startImport:'インポート開始',
    importing:'インポート中…',addMedia:'メディアを追加',
    addSuno:'Sunoデータを保存',songTitle:'曲名',lyrics:'歌詞'
  }),
  admin:Object.freeze({...en.admin,
    eyebrow:'システム管理',loginTitle:'管理者ログイン',
    loginIntro:'管理者サイト',signIn:'Googleでログイン',
    checking:'管理者権限を確認中…',
    denied:'このアカウントには管理者権限がありません。',
    overview:'全体概要',theme:'既定のテーマ',item:'管理項目'
  }),
  format:Object.freeze({
    searchScope:label=>`「${label}」を検索中…`,
    searchResult:({label,query,hasMore,partial=''})=>`${label}で「${query}」を検索${hasMore?'・さらに結果があります':''}${partial}`,
    relatedText:index=>`関連テキスト ${index}`,
    link:index=>`リンク ${index}`,
    songLink:index=>`楽曲リンク ${index}`,
    period:index=>`時期 ${index}`,
    selected:value=>`選択済み｜${value}`
  })
});

export const UI_LOCALE='zh-Hant';
export const UI_LOCALE_OPTIONS=Object.freeze([
  Object.freeze({value:'zh-Hant',label:'繁體中文'}),
  Object.freeze({value:'zh-Hans',label:'简体中文'}),
  Object.freeze({value:'en',label:'English'}),
  Object.freeze({value:'ja',label:'日本語'})
]);
export const UI_COPY=zhHant;
export const UI_DICTIONARIES=Object.freeze({'zh-Hant':zhHant,'zh-Hans':zhHans,en,ja});

export function normalizeUiLocale(locale){
  const value=String(locale||'').trim();
  return UI_DICTIONARIES[value]?value:UI_LOCALE;
}

export function uiCopy(locale=UI_LOCALE){
  return UI_DICTIONARIES[normalizeUiLocale(locale)];
}
