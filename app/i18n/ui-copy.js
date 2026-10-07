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
    autoTheme:'自動（日／夜）'
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
    data:'資料管理',
    article:'文章發表',
    import:'資料匯入',
    period:'時期設定',
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
    signIn:'寄送登入連結',
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

export const UI_LOCALE='zh-Hant';
export const UI_COPY=zhHant;
export const UI_DICTIONARIES=Object.freeze({'zh-Hant':zhHant});

export function uiCopy(locale=UI_LOCALE){
  return UI_DICTIONARIES[locale]||UI_DICTIONARIES[UI_LOCALE];
}
