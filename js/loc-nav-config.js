(() => {
  const GROUPS = ["靈魂","連結","生命","自然","礦物","元素","秩序","無序","特殊"];

  window.LOC_NAV_CONFIG = Object.freeze({
    nav1: [
      { id:"runes", label:"月之符文", href:"runes.html" },
      { id:"game", label:"遊戲", href:"game.html" },
      { id:"context", label:"脈絡", href:"context.html" },
      { id:"evolution", label:"推演", href:"evolution.html" },
      { id:"statics", label:"統計", href:"statics.htm" }
    ],
    pageGroup: {
      "lots.html":"runes",
      "runes.html":"runes",
      "game.html":"game",
      "loc2-game.html":"game",
      "context.html":"context",
      "evolution.html":"evolution",
      "statics.htm":"statics",
      "statics.html":"statics",
      "search.html":"search",
      "index.html":"home"
    },
    nav2: {
      home: [
        ["LOC月典簡介","#top"],
        ["新手上路","#start"],
        ["LOC架構圖","#framework-map"],
        ["目前進度","#progress"],
        ["作者的話","#about-title"]
      ],
      runes: [
        ["新手上路","lots.html#beginner"],
        ["占卜抽籤","lots.html#draw"],
        ["符文總覽","lots.html#library"],
        ["符文統計","statics.htm#runes"],
        ["符文知識庫","runes.html#reference"]
      ],
      context: [
        ["關係圖","graph"],
        ["節點","nodes"],
        ["關聯","edges"],
        ["情境","scenarios"]
      ],
      evolution: [
        ["時期","overview"],
        ["時間線","timeline"],
        ["趨勢","trend"],
        ["軌跡","trajectory"]
      ]
    },
    sections: {
      framework: ["月之符文模組","脈絡","音樂","文字創作","多媒體","演算法","演算模組","推演引擎"],
      draw: [
        ["單卡","lots.html?mode=single#draw"],
        ["每日","lots.html?mode=daily#draw"],
        ["雙卡","lots.html?mode=2card#draw"],
        ["三卡","lots.html?mode=3card#draw"],
        ["五卡","lots.html?mode=5card#draw"],
        ["11卡","lots.html?mode=ow3gs#draw"],
        ["說明","lots.html#draw-help"]
      ],
      groups: GROUPS.map(group => [group,`lots.html?group=${encodeURIComponent(group)}#library`,group])
    }
  });
})();
